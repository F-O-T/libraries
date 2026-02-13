import type { ErrorCorrectionLevel } from "./types.ts";
import { ALIGNMENT_PATTERNS, getFormatInfo, getVersionInfo } from "./tables.ts";

/**
 * QR code matrix representation.
 * modules[row][col]: true = dark, false = light
 * reserved[row][col]: true = function pattern (not data)
 */
export type QrMatrix = {
  modules: boolean[][];
  reserved: boolean[][];
  size: number;
};

/**
 * Create a blank QR matrix of the given size.
 */
export function createMatrix(version: number): QrMatrix {
  const size = version * 4 + 17;
  const modules: boolean[][] = [];
  const reserved: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    modules.push(new Array(size).fill(false));
    reserved.push(new Array(size).fill(false));
  }
  return { modules, reserved, size };
}

/**
 * Place all function patterns on the matrix.
 */
export function placeFunctionPatterns(matrix: QrMatrix, version: number): void {
  placeFinderPatterns(matrix);
  placeSeparators(matrix);
  placeAlignmentPatterns(matrix, version);
  placeTimingPatterns(matrix);
  placeDarkModule(matrix, version);
  reserveFormatArea(matrix);
  if (version >= 7) {
    reserveVersionArea(matrix);
  }
}

/**
 * Place data bits into the matrix following the zigzag pattern.
 */
export function placeDataBits(matrix: QrMatrix, data: number[]): void {
  const { size, modules, reserved } = matrix;

  // Convert data to bit array
  const bits: number[] = [];
  for (const byte of data) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
  }

  let bitIndex = 0;

  // Zigzag pattern: start from bottom-right, move upward in 2-column groups
  // Column 6 is skipped (timing pattern)
  let col = size - 1;
  while (col >= 0) {
    if (col === 6) col--; // Skip timing pattern column

    for (let row = 0; row < size; row++) {
      // Determine actual row based on direction
      // Even column-pairs go upward, odd go downward
      const colPairIndex = col < 6 ? (size - 1 - col) : (size - 1 - col - 1);
      const goingUp = colPairIndex % 2 === 0;
      const actualRow = goingUp ? (size - 1 - row) : row;

      // Try both columns in the pair (right then left)
      for (let c = 0; c < 2; c++) {
        const actualCol = col - c;
        if (actualCol < 0) continue;
        if (reserved[actualRow]![actualCol]) continue;
        if (bitIndex < bits.length) {
          modules[actualRow]![actualCol] = bits[bitIndex]! === 1;
          bitIndex++;
        }
      }
    }

    col -= 2;
  }
}

/**
 * Apply format information to the matrix.
 */
export function applyFormatInfo(
  matrix: QrMatrix,
  ecLevel: ErrorCorrectionLevel,
  maskPattern: number,
): void {
  const formatInfo = getFormatInfo(ecLevel, maskPattern);
  const { size, modules } = matrix;

  // Format info is 15 bits
  // Place around top-left finder pattern
  for (let i = 0; i < 15; i++) {
    const bit = ((formatInfo >> (14 - i)) & 1) === 1;

    // Horizontal strip (top-left)
    if (i < 6) {
      modules[8]![i] = bit;
    } else if (i === 6) {
      modules[8]![7] = bit;
    } else if (i === 7) {
      modules[8]![8] = bit;
    } else {
      modules[8]![size - 15 + i] = bit;
    }

    // Vertical strip (top-left)
    if (i < 6) {
      modules[size - 1 - i]![8] = bit;
    } else if (i === 6) {
      modules[size - 7]![8] = bit;
    } else if (i === 7) {
      modules[8]![8] = bit; // Already set above, same position
    } else if (i === 8) {
      modules[7]![8] = bit;
    } else {
      modules[14 - i]![8] = bit;
    }
  }
}

/**
 * Apply version information to the matrix (versions 7+).
 */
export function applyVersionInfo(matrix: QrMatrix, version: number): void {
  const versionInfo = getVersionInfo(version);
  if (versionInfo === null) return;

  const { size, modules } = matrix;

  for (let i = 0; i < 18; i++) {
    const bit = ((versionInfo >> i) & 1) === 1;
    const row = Math.floor(i / 3);
    const col = (size - 11) + (i % 3);

    // Bottom-left version info block
    modules[col]![row] = bit;
    // Top-right version info block
    modules[row]![col] = bit;
  }
}

// --- Private helper functions ---

function placeFinderPatterns(matrix: QrMatrix): void {
  const { size } = matrix;
  // Top-left
  placeFinderPattern(matrix, 0, 0);
  // Top-right
  placeFinderPattern(matrix, 0, size - 7);
  // Bottom-left
  placeFinderPattern(matrix, size - 7, 0);
}

function placeFinderPattern(matrix: QrMatrix, startRow: number, startCol: number): void {
  const { modules, reserved } = matrix;
  const pattern = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ];

  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const row = startRow + r;
      const col = startCol + c;
      modules[row]![col] = pattern[r]![c]! === 1;
      reserved[row]![col] = true;
    }
  }
}

function placeSeparators(matrix: QrMatrix): void {
  const { size, modules, reserved } = matrix;

  // Horizontal separators
  for (let c = 0; c < 8; c++) {
    // Top-left (below finder)
    if (8 < size) {
      modules[7]![c] = false;
      reserved[7]![c] = true;
    }
    // Top-right (below finder)
    modules[7]![size - 8 + c] = false;
    reserved[7]![size - 8 + c] = true;
    // Bottom-left (above finder)
    modules[size - 8]![c] = false;
    reserved[size - 8]![c] = true;
  }

  // Vertical separators
  for (let r = 0; r < 8; r++) {
    // Top-left (right of finder)
    modules[r]![7] = false;
    reserved[r]![7] = true;
    // Top-right (left of finder)
    modules[r]![size - 8] = false;
    reserved[r]![size - 8] = true;
    // Bottom-left (right of finder)
    modules[size - 8 + r]![7] = false;
    reserved[size - 8 + r]![7] = true;
  }
}

function placeAlignmentPatterns(matrix: QrMatrix, version: number): void {
  const positions = ALIGNMENT_PATTERNS[version - 1];
  if (!positions || positions.length === 0) return;

  for (const row of positions) {
    for (const col of positions) {
      // Skip if overlapping with finder patterns
      if (isFinderArea(matrix.size, row, col)) continue;
      placeAlignmentPattern(matrix, row, col);
    }
  }
}

function isFinderArea(size: number, centerRow: number, centerCol: number): boolean {
  // Top-left finder: rows 0-8, cols 0-8
  if (centerRow <= 8 && centerCol <= 8) return true;
  // Top-right finder: rows 0-8, cols size-9 to size-1
  if (centerRow <= 8 && centerCol >= size - 9) return true;
  // Bottom-left finder: rows size-9 to size-1, cols 0-8
  if (centerRow >= size - 9 && centerCol <= 8) return true;
  return false;
}

function placeAlignmentPattern(matrix: QrMatrix, centerRow: number, centerCol: number): void {
  const { modules, reserved } = matrix;
  const pattern = [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
  ];

  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const row = centerRow + r;
      const col = centerCol + c;
      modules[row]![col] = pattern[r + 2]![c + 2]! === 1;
      reserved[row]![col] = true;
    }
  }
}

function placeTimingPatterns(matrix: QrMatrix): void {
  const { size, modules, reserved } = matrix;

  // Horizontal timing pattern (row 6)
  for (let c = 8; c < size - 8; c++) {
    if (!reserved[6]![c]) {
      modules[6]![c] = c % 2 === 0;
      reserved[6]![c] = true;
    }
  }

  // Vertical timing pattern (column 6)
  for (let r = 8; r < size - 8; r++) {
    if (!reserved[r]![6]) {
      modules[r]![6] = r % 2 === 0;
      reserved[r]![6] = true;
    }
  }
}

function placeDarkModule(matrix: QrMatrix, version: number): void {
  // Dark module is always at (4 * version + 9, 8)
  const row = 4 * version + 9;
  matrix.modules[row]![8] = true;
  matrix.reserved[row]![8] = true;
}

function reserveFormatArea(matrix: QrMatrix): void {
  const { size, reserved } = matrix;

  // Around top-left finder pattern
  for (let i = 0; i < 9; i++) {
    reserved[8]![i] = true; // Horizontal
    reserved[i]![8] = true; // Vertical
  }

  // Around top-right finder pattern
  for (let i = 0; i < 8; i++) {
    reserved[8]![size - 1 - i] = true;
  }

  // Around bottom-left finder pattern
  for (let i = 0; i < 8; i++) {
    reserved[size - 1 - i]![8] = true;
  }
}

function reserveVersionArea(matrix: QrMatrix): void {
  const { size, reserved } = matrix;

  // Bottom-left version info (6x3 block)
  for (let r = 0; r < 6; r++) {
    for (let c = size - 11; c < size - 8; c++) {
      reserved[r]![c] = true;
    }
  }

  // Top-right version info (3x6 block)
  for (let r = size - 11; r < size - 8; r++) {
    for (let c = 0; c < 6; c++) {
      reserved[r]![c] = true;
    }
  }
}
