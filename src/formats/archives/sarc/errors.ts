import { ArrayBufferUtils, StringEncoding, StringUtils } from "nnfileabstraction";
import { MagicU32 } from "../../../util/magicU32";

export class InvalidBomError extends Error {
  constructor(
      public expectedLE: number,
      public expectedBE: number,
      public actual: number,
      public bomSizeBytes?: number,
  ) {
    let beStr = expectedBE.toString(16);
    let leStr = expectedLE.toString(16);
    let actualStr = actual.toString(16);

    if (bomSizeBytes !== undefined) {
      beStr = beStr.padStart(bomSizeBytes * 2, "0");
      leStr = leStr.padStart(bomSizeBytes * 2, "0");
      actualStr = actualStr.padStart(bomSizeBytes * 2, "0")
    }

    super(`Invalid BOM! Expected: 0x${beStr} (BE) or 0x${leStr} (LE), Got: 0x${actualStr} (Read as BE)`)
  }
}

export class InvalidMagicError extends Error {
  constructor(
      public expectedMagic: MagicU32,
      public actualMagic: MagicU32,
  ) {
    super(`Expected magic: ${expectedMagic}, Got: ${actualMagic}`)
  }
}

export class UnsupportedVersionError extends Error {
  constructor(supportedVersions: number[], actualVersion: number, versionSerializer: (t: number) => string = (n) => n.toString(10)) {
    super(`Unsupported version ${versionSerializer(actualVersion)}. Expected one of: ${supportedVersions.map(versionSerializer).join(", ")}`);
  }
}

export class CorruptedStruct extends Error {
  constructor(
      public field: string,
      public structName: string,
      public assertedValue: number,
      public actualValue: number,
  ) {
    super(`Struct ${structName} is likely corrupt. Field ${field} has value ${actualValue}, when ${assertedValue} was expected.`);
  }
}
