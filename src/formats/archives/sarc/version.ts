import { Endianness, ReadableSpan, StructType, WritableSpan } from "nnfileabstraction";
import { Version } from "../../../util/version";

export class SarcVersion extends Version<SarcVersion> {
  static read<RE>(offset: number, span: ReadableSpan<RE>, endianness: Endianness) {
    const v = endianness == Endianness.BigEndian
      ? span.getUInt16BE(offset)
      : span.getUInt16LE(offset);

    return v.map(v => ({ value: new SarcVersion(v >> 8, v & 0xFF), bytesRead: 2 }));
  }

  static write<WE>(offset: number, value: SarcVersion, span: WritableSpan<any, any, WE>, endianness: Endianness) {
    const v = (value.major << 8) | value.minor;

    return endianness == Endianness.BigEndian
      ? span.setUInt16BE(offset, v)
      : span.setUInt16LE(offset, v);
  }

  public static Type = SarcVersion as any as (StructType<SarcVersion, never>);

  constructor(
    public major: number,
    public minor: number,
  ) {
    super();
  }

  toString() {
    return `${this.major}.${this.minor}`;
  }

  equals(other: SarcVersion) {
    return this.major == other.major && this.minor == other.minor;
  }

  isGreaterThan(other: SarcVersion) {
    return this.major > other.major || (this.major == other.major && this.minor > other.minor);
  }

  isLessThan(other: SarcVersion) {
    return this.major < other.major || (this.major == other.major && this.minor < other.minor);
  }
}