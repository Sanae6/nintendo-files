import {
  ArrayBufferUtils,
  Endianness,
  ReadableSpan, ReadOutOfBoundsError, Result,
  StringEncoding,
  StringUtils,
  StructType,
  WritableSpan
} from "nnfileabstraction";
import { InvalidMagicError } from "../formats/archives/sarc/errors";

export class MagicU32 {
  static read<RE>(offset: number, span: ReadableSpan<RE>, endianness: Endianness) {
    const v = endianness == Endianness.BigEndian ? span.getUInt32BE(offset) : span.getUInt32LE(offset);

    return v.map(v => ({ value: new MagicU32(v), bytesRead: 4 }));
  }

  static write<WE>(offset: number, value: MagicU32, span: WritableSpan<any, any, WE>, endianness: Endianness) {
    return endianness == Endianness.BigEndian ? span.setUInt32BE(offset, value.toInteger()) : span.setUInt32LE(offset, value.toInteger());
  }

  static Type = MagicU32 as any as (StructType<MagicU32, never>)

  private asInteger: number;
  private asText: string;

  constructor(value: number | string) {
    if (typeof value === "string") {
      this.asInteger = StringUtils.encodeUTF8(value).getUint32(0, false);

      this.asText = value;
    } else {
      this.asInteger = value;

      const res = StringUtils.decode(ArrayBufferUtils.toDataView(new Uint32Array([value])), StringEncoding.UTF8)

      this.asText = res.isOk() ? res.unwrap() : `0x${ this.asInteger.toString(16).padStart(8, "0") }`;
    }
  }

  toString() {
    return this.asText;
  }

  toInteger() {
    return this.asInteger;
  }

  equals(magic: MagicU32) {
    return this.asInteger == magic.asInteger;
  }

  validate(actual: MagicU32): <T>(v: T) => Result<T, InvalidMagicError> {
    if (this.equals(actual))
      return <T>(v: T) => Result.ok(v);
    else
      return <T>(_v: T) => Result.err(new InvalidMagicError(this, actual))
  }
}
