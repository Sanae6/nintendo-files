import { Endianness, ReadableSpan, Result, StructType, WritableSpan } from "nnfileabstraction";
import { InvalidBomError } from "./errors";

export class ByteOrderMark extends StructType<Endianness, InvalidBomError> {
  constructor(
    private be: number,
    private le: number
  ) { super() }

  read<RE>(offset: number, span: ReadableSpan<RE>, endianness: Endianness) {
    const value = endianness == Endianness.BigEndian
      ? span.getUInt16BE(offset)
      : span.getUInt16LE(offset);

    return value.map(v => {
      if (v == this.be) return Result.ok({ value: Endianness.BigEndian, bytesRead: 2 })
      else if (v == this.le) return Result.ok({ value: Endianness.LittleEndian, bytesRead: 2 })
      else return Result.err(new InvalidBomError(this.le, this.be, v))
    });
  }

  write<WE>(offset: number, value: Endianness, span: WritableSpan<any, any, WE>, endianness: Endianness) {
    const v = value == Endianness.BigEndian ? this.be : this.le;

    return endianness == Endianness.BigEndian
      ? span.setUInt16BE(offset, v)
      : span.setUInt16LE(offset, v);
  }
}