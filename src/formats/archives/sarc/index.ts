import { AsyncIterator, Folder, FolderRecord, Future, Option, ReadOutOfBoundsError, ReadableSpan, Result, StringDecodeError } from "nnfileabstraction";
import { SimpleArchiveFile } from "./file";
import { SarcIdentifier } from "./identifier";
import { SarcHeader, SfatHeader, SfatNode, SfntHeader } from "./structs";
import { NotEnoughBytesAvailableError } from "../../../util/errors";
import { CorruptedStructError } from "nnfileabstraction/dist/struct/errors";
import { InvalidMagicError, OffsetArgumentInvalidError, SarcFileNotFoundError } from "./errors";

export * from "./structs";

export class SimpleArchive<RE> extends Folder<
  SarcIdentifier, // Identifier
  SimpleArchiveFile, // FileType
  never, // FolderType
  ReadOutOfBoundsError | StringDecodeError | NotEnoughBytesAvailableError | InvalidMagicError | RE | CorruptedStructError<number> | OffsetArgumentInvalidError, // GetError
  NotEnoughBytesAvailableError | InvalidMagicError | RE | CorruptedStructError<number>, // ListError
  ReadOutOfBoundsError | StringDecodeError | RE | CorruptedStructError<number> | OffsetArgumentInvalidError // ListItemError
> {
  static load<T>(span: ReadableSpan<T>, offset = 0) {
    return SarcHeader.deserializeBomFuture(span, offset)
      .mapErr(e => e instanceof ReadOutOfBoundsError ? new NotEnoughBytesAvailableError("header", SarcHeader.Size, e.sliceSize - e.offsetInSlice) : e)
      .map(h => h.assertValid(h))
      .zip(header => span.slice(offset, header.value.fileSize))
      .mapErr(e => e instanceof ReadOutOfBoundsError ? new NotEnoughBytesAvailableError("file content", e.readLength, e.sliceSize - e.offsetInSlice) : e)
      .map(([header, fileContentSpan]) => new SimpleArchive<T>(header, fileContentSpan))
  }

  private constructor(
    private header: SarcHeader,
    private fileContentSpan: ReadableSpan<RE>,
  ) { super() }

  getVersion() { return this.header.value.version }
  getEndianness() { return this.header.value.byteOrderMark }

  hash(data: string) {
    return this.getFileAllocationTableHeader()
      .map(h => SarcIdentifier.hash(data, h.value.hashKey))
  }

  private getFileAllocationTableHeader() {
    return SfatHeader.deserialize(this.fileContentSpan, this.header.value.byteOrderMark, SarcHeader.Size)
      .mapErr(e => e instanceof ReadOutOfBoundsError ? new NotEnoughBytesAvailableError("file allocation table header", SfatHeader.Size, e.sliceSize - e.offsetInSlice) : e)
      .map(h => (h as SfatHeader).assertValid(h as SfatHeader))
  }

  private getFileNameTable(nodeCount: number) {
    const sfntOffset = SarcHeader.Size + SfatHeader.Size + nodeCount * SfatNode.Size;

    return SfntHeader.deserialize(this.fileContentSpan, this.header.value.byteOrderMark, sfntOffset)
      .mapErr(e => e instanceof ReadOutOfBoundsError ? new NotEnoughBytesAvailableError("file name table header", SfntHeader.Size, e.sliceSize - e.offsetInSlice) : e)
      .map(h => (h as SfntHeader).assertValid(h as SfntHeader))
      .map(h => this.fileContentSpan.slice(sfntOffset + SfntHeader.Size, this.header.value.startPtr - (sfntOffset + SfntHeader.Size)))
  }

  list() {
    return this.getFileAllocationTableHeader()
      .map(header => header.value.nodeCount)
      .zip(count => this.getFileNameTable(count).okF())
      .map(([count, nameTable]) => AsyncIterator.range(0, count - 1)
        .map(i => SimpleArchiveFile
          .load(this.fileContentSpan, this.header.value.byteOrderMark, SarcHeader.Size + SfatHeader.Size + (i * SfatNode.Size))
          .map(n => n.getRecord(nameTable))))
  }

  get(t: SarcIdentifier) {
    return this
      .list()
      .map(l => l.find(r => r.isErr() || r.unwrap().identifier.equals(t)))
      .map(o => o.unwrapOr(Result.err(new SarcFileNotFoundError(t))))
      .map(r => r.content)
  }
}