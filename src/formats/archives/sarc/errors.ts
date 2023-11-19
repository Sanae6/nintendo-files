import { MagicU32 } from "../../../util/magicU32";
import { SarcIdentifier } from "./identifier";

export class InvalidMagicError extends Error {
  constructor(
      public expectedMagic: MagicU32,
      public actualMagic: MagicU32,
  ) {
    super(`Expected magic: ${expectedMagic}, Got: ${actualMagic}`)
  }
}

export class OffsetArgumentInvalidError extends Error {
  constructor(
    public offset: number,
    public availableSize: number,
  ) {
    super("Offset argument invalid. Provided offset: " + offset + ", however only " + availableSize + " bytes are available.");
  }
}

export class SarcFileNotFoundError extends Error {
  constructor(
    public identifier: SarcIdentifier,
  ) {
    super("File not found: " + identifier.toString());
  }
}