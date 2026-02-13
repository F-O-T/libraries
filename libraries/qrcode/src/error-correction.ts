import type { ErrorCorrectionLevel } from "./types.ts";
import { EC_TABLE } from "./tables.ts";

/**
 * GF(2^8) arithmetic with primitive polynomial 0x11D (x^8 + x^4 + x^3 + x^2 + 1).
 */
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

// Build GF(2^8) log and exp tables
(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = x << 1;
    if (x >= 256) {
      x ^= 0x11d; // primitive polynomial
    }
  }
  // Extend exp table for convenience in multiplication
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]!;
  }
})();

function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[(GF_LOG[a]! + GF_LOG[b]!) % 255]!;
}

/**
 * Generate a Reed-Solomon generator polynomial for the given number of EC codewords.
 * Returns coefficients in descending order of power.
 */
function generateGeneratorPolynomial(ecCount: number): number[] {
  let gen = [1];
  for (let i = 0; i < ecCount; i++) {
    const newGen = new Array(gen.length + 1).fill(0);
    const factor = GF_EXP[i]!;
    for (let j = 0; j < gen.length; j++) {
      newGen[j] = (newGen[j]! ^ gfMultiply(gen[j]!, 1)) & 0xff;
      newGen[j + 1] = (newGen[j + 1]! ^ gfMultiply(gen[j]!, factor)) & 0xff;
    }
    gen = newGen;
  }
  return gen;
}

/**
 * Compute Reed-Solomon error correction codewords for a data block.
 */
function computeEC(data: number[], ecCount: number): number[] {
  const gen = generateGeneratorPolynomial(ecCount);

  // Create working array: data + ecCount zeros
  const result = new Array(data.length + ecCount).fill(0);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i]!;
  }

  // Polynomial long division
  for (let i = 0; i < data.length; i++) {
    const coef = result[i]!;
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        result[i + j] = result[i + j]! ^ gfMultiply(gen[j]!, coef);
      }
    }
  }

  // Remainder (EC codewords) are at the end
  return result.slice(data.length);
}

type BlockInfo = {
  dataCodewords: number[];
  ecCodewords: number[];
};

/**
 * Split data into blocks, compute EC for each, and interleave.
 * Returns the final sequence of all data + EC codewords.
 */
export function generateErrorCorrection(
  dataCodewords: number[],
  version: number,
  ecLevel: ErrorCorrectionLevel,
): number[] {
  const ecEntry = EC_TABLE[version - 1]![ecLevel]!;
  const { ecCodewordsPerBlock, group1Blocks, group1DataCodewords, group2Blocks, group2DataCodewords } = ecEntry;

  // Split data into blocks
  const blocks: BlockInfo[] = [];
  let offset = 0;

  // Group 1 blocks
  for (let i = 0; i < group1Blocks; i++) {
    const blockData = dataCodewords.slice(offset, offset + group1DataCodewords);
    offset += group1DataCodewords;
    blocks.push({
      dataCodewords: blockData,
      ecCodewords: computeEC(blockData, ecCodewordsPerBlock),
    });
  }

  // Group 2 blocks
  for (let i = 0; i < group2Blocks; i++) {
    const blockData = dataCodewords.slice(offset, offset + group2DataCodewords);
    offset += group2DataCodewords;
    blocks.push({
      dataCodewords: blockData,
      ecCodewords: computeEC(blockData, ecCodewordsPerBlock),
    });
  }

  // Interleave data codewords
  const result: number[] = [];
  const maxDataLength = Math.max(group1DataCodewords, group2DataCodewords);
  for (let i = 0; i < maxDataLength; i++) {
    for (const block of blocks) {
      if (i < block.dataCodewords.length) {
        result.push(block.dataCodewords[i]!);
      }
    }
  }

  // Interleave EC codewords
  for (let i = 0; i < ecCodewordsPerBlock; i++) {
    for (const block of blocks) {
      if (i < block.ecCodewords.length) {
        result.push(block.ecCodewords[i]!);
      }
    }
  }

  return result;
}
