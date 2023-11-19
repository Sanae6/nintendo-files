import { Endianness, Future, Option, ReadOutOfBoundsError, ReadableSpan, Result, StringDecodeError, StringEncoding, StringUtils, Struct, Types } from "nnfileabstraction";
import * as util from "util";
import { InvalidMagicError } from "./errors";
import { MagicU32 } from "../../../util/magicU32";
import { VersionSet } from "../../../util/version";
import { SarcVersion } from "./version";
import { ByteOrderMark } from "../../../util/bom";
import { CorruptedStructError, CorruptedStructFieldNotEqualError, CorruptedStructFieldNotGreaterThanError } from "nnfileabstraction/dist/struct/errors";
import { InvalidBomError, UnsupportedVersionError } from "util/errors";

const SarcHeaderBom = new ByteOrderMark(0xFEFF, 0xFFFE);

export class SarcHeader extends Struct.Definition("SarcHeader", <const>[
  Struct.Field("magic", MagicU32.Type, Endianness.BigEndian),
  Struct.Field("headerLength", Types.UInt16),
  Struct.Field("byteOrderMark", SarcHeaderBom, Endianness.BigEndian),
  Struct.Field("fileSize", Types.UInt32),
  Struct.Field("startPtr", Types.UInt32),
  Struct.Field("version", SarcVersion.Type),
  Struct.Padding(2),
]) {
  static BOM = SarcHeaderBom;
  static Size = 20;
  static Magic = new MagicU32("SARC");
  static SupportedVersions = new VersionSet(
    new SarcVersion(1, 0),
  );

  static deserializeBomFuture<T>(span: ReadableSpan<T>, offset = 0) {
    return Future.fromAsyncResult(() => this.deserializeBom(span, offset));
  }

  static async deserializeBom<T>(span: ReadableSpan<T>, offset = 0): Promise<Result<SarcHeader, ReadOutOfBoundsError | T | InvalidBomError>> {
    const bom = await SarcHeader.BOM.read(offset + 6, span, Endianness.BigEndian);

    if (bom.isErr()) return bom;

    return <Result<SarcHeader, ReadOutOfBoundsError | T>> <any> await super.deserialize(span, bom.unwrap().value, offset);
  }

  public assertValid<T>(r: T): Result<T, InvalidMagicError | UnsupportedVersionError<SarcVersion> | CorruptedStructFieldNotEqualError<this["value"], "headerLength">> {
    return Result.ok(r)
      .map(SarcHeader.Magic.validate(this.value.magic))
      .map(SarcHeader.SupportedVersions.assertIncludes(this.value.version))
      .map(this.assertFieldEquals("headerLength", SarcHeader.Size))
  }
}

export class SfatHeader extends Struct.Definition("SfatHeader", <const>[
  Struct.Field("magic", MagicU32.Type, Endianness.BigEndian),
  Struct.Field("headerLength", Types.UInt16),
  Struct.Field("nodeCount", Types.UInt16),
  Struct.Field("hashKey", Types.UInt32),
]) {
  static Magic = new MagicU32("SFAT");
  static Size = 12;

  public assertValid<T>(r: T): Result<T, InvalidMagicError | CorruptedStructError<number>> {
    return Result.ok(r)
      .map(SfatHeader.Magic.validate(this.value.magic))
      .map(this.assertFieldEquals("headerLength", SfatHeader.Size))
      .map(this.assertFieldEquals("hashKey", 0x65))
  }
}

export class SfatNode extends Struct.Definition("SfatNode", <const> [
  Struct.Field("nameHash", Types.UInt32),
  Struct.Field("fileAttributes", Types.UInt32),
  Struct.Field("startPtr", Types.UInt32),
  Struct.Field("endPtr", Types.UInt32),
]) {
  static Size = 16;

  private hasFileName() {
    return (this.value.fileAttributes & 0x01000000) != 0;
  }

  getFileName<RE>(fileNameTable: ReadableSpan<RE>): Option<Future<string, RE | ReadOutOfBoundsError | StringDecodeError>> {
    return Option.if(this.hasFileName(), (this.value.fileAttributes & 0xFFFF) * 4)
      .map(offset => fileNameTable.getStringToNull(offset, StringEncoding.UTF8).map(r => r.value))
  }

  static hashName(name: string, key: number) {
    const encoded = StringUtils.encodeUTF8(name);

    let result = 0;

    for (let i = 0; i < encoded.byteLength; i++) {
      result = (encoded.getUint8(i) + result * key) >>> 0;
    }

    return result;
  }

  isHashValid<RE>(fileNameTable: ReadableSpan<RE>, key: number): Option<Future<boolean, RE | ReadOutOfBoundsError | StringDecodeError>> {
    return this.getFileName(fileNameTable)
      .map(fileName => fileName
        .map(name => this.value.nameHash == SfatNode.hashName(name, key)));
  }

  getFileData(span: ReadableSpan<unknown>) {
    return span.slice(this.value.startPtr, this.value.endPtr - this.value.startPtr);
  }

  public assertValue<T>(r: T): Result<T, CorruptedStructError<number>> {
    return Result.ok(r)
      .map(this.assertFieldGreaterThan("endPtr", this.value.startPtr))
  }
}

export class SfntHeader extends Struct.Definition("SfntHeader", <const>[
  Struct.Field("magic", MagicU32.Type, Endianness.BigEndian),
  Struct.Field("headerLength", Types.UInt16),
  Struct.Padding(2),
]) {
  static Magic = new MagicU32("SFNT");
  static Size = 8;

  public assertValid<T>(r: T): Result<T, InvalidMagicError | CorruptedStructError<number>> {
    return Result.ok(r)
      .map(SfntHeader.Magic.validate(this.value.magic))
      .map(this.assertFieldEquals("headerLength", SfntHeader.Size))
  }
}
