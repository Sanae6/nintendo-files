import { Endianness, Future, ReadOutOfBoundsError, ReadableSpan, Result, StringEncoding, Struct, Types } from "nnfileabstraction";
import * as util from "util";
import { CorruptedStruct, InvalidBomError, InvalidMagicError, UnsupportedVersionError } from "./errors";
import { MagicU32 } from "../../../util/magicU32";

export class SarcHeader extends Struct.Definition(<const>[
  Struct.Field("magic", MagicU32.Type, Endianness.BigEndian),
  Struct.Field("headerLength", Types.UInt16),
  Struct.Field("byteOrderMark", Types.UInt16),
  Struct.Field("fileSize", Types.UInt32),
  Struct.Field("startPtr", Types.UInt32),
  Struct.Field("version", Types.UInt16),
  Struct.Padding(2),
]) {
  static Size = 20;
  static Magic = new MagicU32("SARC");

  static SupportedVersions = [
      0x01_00,
  ]

  static deserializeBomFuture<T>(span: ReadableSpan<T>, offset = 0) {
    return Future.fromAsyncResult(() => this.deserializeBom(span, offset));
  }

  static async deserializeBom<T>(span: ReadableSpan<T>, offset = 0): Promise<Result<SarcHeader, ReadOutOfBoundsError | T | InvalidBomError>> {
    const bom = await span.getUInt16BE(offset + 6);

    if (bom.isErr()) return bom;

    let endianness: Endianness;

    if (bom.unwrap() == 0xFEFF) endianness = Endianness.BigEndian;
    else if (bom.unwrap() == 0xFFFE) endianness = Endianness.LittleEndian;
    else return Result.err(new InvalidBomError(0xFFFE, 0xFEFF, bom.unwrap(), 2));

    return <Result<SarcHeader, ReadOutOfBoundsError | T>> <any> await super.deserialize(span, endianness, offset).map(header => ({ header, endianness }));
  }

  public assertValid<T>(r: T): Result<T, InvalidMagicError | UnsupportedVersionError> {
    return Result.ok(r)
        .map(SarcHeader.Magic.validate(this.value.magic))
        .map(t => SarcHeader.SupportedVersions.includes(this.value.version) ? Result.ok(t) : Result.err(new UnsupportedVersionError(SarcHeader.SupportedVersions, this.value.version, (n) => {
          return `${n >> 8}.${n & 0xFF}`;
        })))
        .map(t => this.value.headerLength === SarcHeader.Size ? Result.ok(t) : Result.err(new CorruptedStruct("headerLength", "SarcHeader", SarcHeader.Size, this.value.headerLength)))
  }

  getEndianness(): Endianness {
    return this.value.byteOrderMark == 0xFEFF ? Endianness.BigEndian : Endianness.LittleEndian
  }
}

export class SfatHeader extends Struct.Definition(<const>[
  Struct.Field("magic", Types.FixedString(4, StringEncoding.UTF8)),
  Struct.Field("headerLength", Types.UInt16),
  Struct.Field("nodeCount", Types.UInt16),
  Struct.Field("hashKey", Types.UInt32),
]) {
  isValid() {
    return this.value.magic === "SFAT" && this.value.headerLength === 0xC && this.value.hashKey == 0x65;
  }
}

export class SfatNode extends Struct.Definition(<const>[
  Struct.Field("nameHash", Types.UInt32),
  Struct.Field("fileAttributes", Types.UInt32),
  Struct.Field("startPtr", Types.UInt32),
  Struct.Field("endPtr", Types.UInt32),
]) {
  fileNameOffset(): number | undefined {
    return (this.value.fileAttributes & 0x01000000) != 0 ? this.value.fileAttributes & 0xFFFF : undefined;
  }

  isValidRange() {
    return this.value.startPtr <= this.value.endPtr;
  }
}

export class SfntHeader extends Struct.Definition(<const>[
  Struct.Field("magic", Types.FixedString(4, StringEncoding.UTF8)),
  Struct.Field("headerLength", Types.UInt16),
  Struct.Padding(2),
]) {
  isValid() {
    return this.value.magic === "SFAT" && this.value.headerLength == 0x8;
  }
}
