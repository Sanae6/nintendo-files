import { Future, IdentifierType, Option, ReadableSpan, Result, StringIdentifier } from "nnfileabstraction";
import { SfatNode } from "./structs";

const Cache = new Map<number, SarcIdentifier>();

export class SarcIdentifier extends IdentifierType {
  static hash(name: string, key: number) {
    const result = SfatNode.hashName(name, key);

    if (Cache.has(result)) {
      const cached = Cache.get(result)!;

      if (cached.stringValue.isNone()) {
        cached.stringValue = Option.some(name);
      }

      return cached;
    }
    
    const newIdentifier = new SarcIdentifier(result, Option.some(name));

    Cache.set(result, newIdentifier);

    return newIdentifier;
  }

  static fromHash(hash: number) {
    if (Cache.has(hash)) {
      return Cache.get(hash)!;
    }

    const newIdentifier = new SarcIdentifier(hash, Option.none());

    Cache.set(hash, newIdentifier);

    return newIdentifier;
  }

  private static fromHashAndString(hash: number, name: string) {
    if (Cache.has(hash)) {
      const cached = Cache.get(hash)!;

      if (cached.stringValue.isNone()) {
        cached.stringValue = Option.some(name);
      }

      return cached;
    }

    const newIdentifier = new SarcIdentifier(hash, Option.some(name));

    Cache.set(hash, newIdentifier);

    return newIdentifier;
  }

  static fromNode<RE>(node: SfatNode, fileNameTable: ReadableSpan<RE>) {
    return node.getFileName(fileNameTable)
      .map(fileName => fileName.map(name => SarcIdentifier.fromHashAndString(node.value.nameHash, name)))
      .unwrapOr(Future.ok(SarcIdentifier.fromHash(node.value.nameHash)));
  }

  protected constructor(public hash: number, private stringValue: Option<string>) { super() }

  equals(other: SarcIdentifier): boolean {
    return this.hash == other.hash;
  }

  toString() {
    return this.stringValue
      .map(s => `SarcIdentifier("${s}")`)
      .unwrapOr(`SarcIdentifier(0x${this.hash.toString(16).padStart(8, "0").toUpperCase()})`);
  }

  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this.toString();
  }
}