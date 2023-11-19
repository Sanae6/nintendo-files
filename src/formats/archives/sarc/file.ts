import { Endianness, FolderContentType, Future, Option, ReadOutOfBoundsError, ReadableSpan, Result, StringDecodeError } from "nnfileabstraction";
import { SfatNode } from "./structs";
import { OffsetArgumentInvalidError } from "./errors";
import { SarcIdentifier } from "./identifier";

export class SimpleArchiveFile {
  static load<T>(span: ReadableSpan<T>, endianness: Endianness, offset = 0) {
    return SfatNode.deserialize(span, endianness, offset)
      .mapErr(e => e instanceof ReadOutOfBoundsError ? new OffsetArgumentInvalidError(offset, span.getSize()) : e)
      .map(n => (n as SfatNode).assertValue(n as SfatNode))
      .map(node => new SimpleArchiveFile(span, node))
  }

  private constructor(
    private span: ReadableSpan<any>,
    private node: SfatNode,
  ) { }

  getIdentifier() {
    return SarcIdentifier.fromHash(this.node.value.nameHash);
  }

  computeIdentifier<RE>(stringTable: Option<ReadableSpan<RE>>) {
    return stringTable
      .map(table => SarcIdentifier.fromNode(this.node, table))
      .unwrapOr(Future.ok(SarcIdentifier.fromHash(this.node.value.nameHash)));
  }

  getAttributes() {
    return this.node.value.fileAttributes;
  }

  getFileData() {
    return this.node.getFileData(this.span);
  }

  getLength() {
    return this.node.value.endPtr - this.node.value.startPtr;
  }

  getRecord<RE>(stringTable: Option<ReadableSpan<RE>>): Future<{identifier: SarcIdentifier, content: SimpleArchiveFile, kind: FolderContentType.File}, RE | ReadOutOfBoundsError | StringDecodeError> {
    return this.computeIdentifier(stringTable).map(i => ({
      identifier: i,
      content: this,
      kind: <const> FolderContentType.File,
    }))
  }

  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `SimpleArchiveFile {\n  name: ${this.getIdentifier()},\n  attributes: 0x${this.getAttributes().toString(16).padStart(8, "0")},\n  length: ${this.getLength()}\n}`;
  }
}