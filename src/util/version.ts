import { Result } from "nnfileabstraction";
import { UnsupportedVersionError } from "./errors";

export abstract class Version<T> {
  abstract toString(): string;
  abstract equals(other: T): boolean;
  abstract isGreaterThan(other: T): boolean;
  abstract isLessThan(other: T): boolean;

  isGreaterThanOrEqual(other: T) {
    return this.equals(other) || this.isGreaterThan(other);
  }

  isLessThanOrEqual(other: T) {
    return this.equals(other) || this.isLessThan(other);
  }
}

export class VersionSet<T extends Version<T>> extends Set<T> {
  constructor(...versions: T[]) {
    super(versions);
  }

  get max() {
    let max: T | undefined = undefined;

    for (const version of this) {
      if (max === undefined || version.isGreaterThan(max)) max = version;
    }

    return max;
  }

  get min() {
    let min: T | undefined = undefined;

    for (const version of this) {
      if (min === undefined || version.isLessThan(min)) min = version;
    }

    return min;
  }
  
  includes(version: T) {
    for (const v of this) {
      if (v.equals(version)) return true;
    }
  }

  assertIncludes(version: T): <V>(v: V) => Result<V, UnsupportedVersionError<T>> {
    if (this.includes(version))
      return <T>(v: T) => Result.ok(v);
    else
      return <T>(_v: T) => Result.err(new UnsupportedVersionError(this, version))
  }

  toString() {
    return Array.from(this).map(v => v.toString()).join(", ");
  }
}