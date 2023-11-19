import { Version, VersionSet } from "./version";

export class UnsupportedVersionError<T extends Version<T>> extends Error {
  constructor(supportedVersions: VersionSet<T>, actualVersion: T) {
    super(`Unsupported version ${actualVersion}. Expected one of: ${supportedVersions}`);
  }
}

export class InvalidBomError extends Error {
  constructor(
      public expectedLE: number,
      public expectedBE: number,
      public actual: number,
  ) {
    let beStr = expectedBE.toString(16).padStart(4, "0");
    let leStr = expectedLE.toString(16).padStart(4, "0");
    let actualStr = actual.toString(16).padStart(4, "0");

    super(`Invalid BOM! Expected: 0x${beStr} (BE) or 0x${leStr} (LE), Got: 0x${actualStr}`)
  }
}

export class NotEnoughBytesAvailableError extends Error {
  constructor(
    public role: string,
    public expectedSize: number,
    public availableSize: number,
  ) {
    super("Not enough bytes available for " + role + ". Expected: " + expectedSize + ", available: " + availableSize);
  }
}