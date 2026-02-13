import type { ErrorCorrectionLevel } from "./types.ts";
import { EC_TABLE, CAPACITIES } from "./tables.ts";

/**
 * Encode data string into QR code bit stream using byte mode.
 * Returns the final data codewords (with padding) for the given version and EC level.
 */
export function encodeData(
  data: string,
  version: number,
  ecLevel: ErrorCorrectionLevel,
): number[] {
  const dataBytes = new TextEncoder().encode(data);
  const bits: number[] = [];

  // Mode indicator for byte mode: 0100
  pushBits(bits, 0b0100, 4);

  // Character count indicator
  const countBits = version <= 9 ? 8 : 16;
  pushBits(bits, dataBytes.length, countBits);

  // Data bytes
  for (const byte of dataBytes) {
    pushBits(bits, byte, 8);
  }

  // Get total data codewords capacity for this version/EC level
  const ecEntry = EC_TABLE[version - 1]![ecLevel]!;
  const totalDataCodewords = ecEntry.dataCodewords;

  const totalDataBits = totalDataCodewords * 8;

  // Terminator: up to 4 zero bits (don't exceed capacity)
  const terminatorLength = Math.min(4, totalDataBits - bits.length);
  for (let i = 0; i < terminatorLength; i++) {
    bits.push(0);
  }

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Convert bits to bytes
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (bits[i + j] ?? 0);
    }
    codewords.push(byte);
  }

  // Fill remaining capacity with alternating pad codewords
  const padBytes = [0xec, 0x11];
  let padIndex = 0;
  while (codewords.length < totalDataCodewords) {
    codewords.push(padBytes[padIndex % 2]!);
    padIndex++;
  }

  return codewords;
}

/**
 * Determine the minimum QR version that can hold the given data length.
 */
export function getMinVersion(
  dataLength: number,
  ecLevel: ErrorCorrectionLevel,
): number {
  const levelIndex: number = { L: 0, M: 1, Q: 2, H: 3 }[ecLevel];
  for (let v = 0; v < CAPACITIES.length; v++) {
    if (CAPACITIES[v]![levelIndex]! >= dataLength) {
      return v + 1;
    }
  }
  throw new Error(
    `Data too long (${dataLength} bytes) for QR code at EC level ${ecLevel}`,
  );
}

function pushBits(bits: number[], value: number, count: number): void {
  for (let i = count - 1; i >= 0; i--) {
    bits.push((value >> i) & 1);
  }
}
