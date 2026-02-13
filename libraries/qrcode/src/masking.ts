import type { QrMatrix } from "./matrix.ts";

/**
 * Mask pattern functions.
 * Each returns true if the module at (row, col) should be flipped.
 */
const MASK_PATTERNS: ((row: number, col: number) => boolean)[] = [
  (row, col) => (row + col) % 2 === 0,                                    // Pattern 0
  (row, _col) => row % 2 === 0,                                            // Pattern 1
  (_row, col) => col % 3 === 0,                                            // Pattern 2
  (row, col) => (row + col) % 3 === 0,                                    // Pattern 3
  (row, col) => (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0,   // Pattern 4
  (row, col) => ((row * col) % 2) + ((row * col) % 3) === 0,             // Pattern 5
  (row, col) => (((row * col) % 2) + ((row * col) % 3)) % 2 === 0,      // Pattern 6
  (row, col) => (((row + col) % 2) + ((row * col) % 3)) % 2 === 0,      // Pattern 7
];

/**
 * Apply a mask pattern to the matrix (only non-reserved modules).
 * This modifies the matrix in place.
 */
export function applyMask(matrix: QrMatrix, pattern: number): void {
  const { size, modules, reserved } = matrix;
  const maskFn = MASK_PATTERNS[pattern]!;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!reserved[row]![col] && maskFn(row, col)) {
        modules[row]![col] = !modules[row]![col];
      }
    }
  }
}

/**
 * Calculate the penalty score for the current matrix state.
 * Evaluates all 4 penalty rules from the QR spec.
 */
export function calculatePenalty(matrix: QrMatrix): number {
  return (
    penaltyRule1(matrix) +
    penaltyRule2(matrix) +
    penaltyRule3(matrix) +
    penaltyRule4(matrix)
  );
}

/**
 * Select the best mask pattern by trying all 8 and returning the one with lowest penalty.
 * Returns the mask pattern number (0-7).
 */
export function selectBestMask(matrix: QrMatrix): number {
  let bestPattern = 0;
  let bestPenalty = Infinity;

  for (let pattern = 0; pattern < 8; pattern++) {
    // Apply mask
    applyMask(matrix, pattern);

    // Calculate penalty
    const penalty = calculatePenalty(matrix);

    // Undo mask (applying same mask again undoes it)
    applyMask(matrix, pattern);

    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestPattern = pattern;
    }
  }

  return bestPattern;
}

// --- Penalty Rules ---

/**
 * Rule 1: Consecutive same-color modules in a row or column.
 * Penalty: (count - 2) for each run of 5+ consecutive same-color modules.
 * Actually: 3 + (count - 5) for each run of 5+.
 */
function penaltyRule1(matrix: QrMatrix): number {
  const { size, modules } = matrix;
  let penalty = 0;

  // Check rows
  for (let row = 0; row < size; row++) {
    let count = 1;
    for (let col = 1; col < size; col++) {
      if (modules[row]![col] === modules[row]![col - 1]) {
        count++;
      } else {
        if (count >= 5) {
          penalty += 3 + (count - 5);
        }
        count = 1;
      }
    }
    if (count >= 5) {
      penalty += 3 + (count - 5);
    }
  }

  // Check columns
  for (let col = 0; col < size; col++) {
    let count = 1;
    for (let row = 1; row < size; row++) {
      if (modules[row]![col] === modules[row - 1]![col]) {
        count++;
      } else {
        if (count >= 5) {
          penalty += 3 + (count - 5);
        }
        count = 1;
      }
    }
    if (count >= 5) {
      penalty += 3 + (count - 5);
    }
  }

  return penalty;
}

/**
 * Rule 2: 2x2 blocks of same-color modules.
 * Penalty: 3 for each 2x2 block.
 */
function penaltyRule2(matrix: QrMatrix): number {
  const { size, modules } = matrix;
  let penalty = 0;

  for (let row = 0; row < size - 1; row++) {
    for (let col = 0; col < size - 1; col++) {
      const val = modules[row]![col];
      if (
        val === modules[row]![col + 1] &&
        val === modules[row + 1]![col] &&
        val === modules[row + 1]![col + 1]
      ) {
        penalty += 3;
      }
    }
  }

  return penalty;
}

/**
 * Rule 3: Finder-like patterns (1011101 preceded/followed by 4 light modules).
 * Penalty: 40 for each occurrence.
 */
function penaltyRule3(matrix: QrMatrix): number {
  const { size, modules } = matrix;
  let penalty = 0;

  // Pattern: 10111010000 or 00001011101
  const pattern1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pattern2 = [false, false, false, false, true, false, true, true, true, false, true];

  // Check rows
  for (let row = 0; row < size; row++) {
    for (let col = 0; col <= size - 11; col++) {
      let match1 = true;
      let match2 = true;
      for (let i = 0; i < 11; i++) {
        if (modules[row]![col + i] !== pattern1[i]) match1 = false;
        if (modules[row]![col + i] !== pattern2[i]) match2 = false;
        if (!match1 && !match2) break;
      }
      if (match1 || match2) penalty += 40;
    }
  }

  // Check columns
  for (let col = 0; col < size; col++) {
    for (let row = 0; row <= size - 11; row++) {
      let match1 = true;
      let match2 = true;
      for (let i = 0; i < 11; i++) {
        if (modules[row + i]![col] !== pattern1[i]) match1 = false;
        if (modules[row + i]![col] !== pattern2[i]) match2 = false;
        if (!match1 && !match2) break;
      }
      if (match1 || match2) penalty += 40;
    }
  }

  return penalty;
}

/**
 * Rule 4: Proportion of dark modules.
 * Penalty: 10 * k where k = floor(|50 - percentage| / 5).
 */
function penaltyRule4(matrix: QrMatrix): number {
  const { size, modules } = matrix;
  let darkCount = 0;
  const total = size * size;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (modules[row]![col]) darkCount++;
    }
  }

  const percentage = (darkCount / total) * 100;
  const k = Math.floor(Math.abs(percentage - 50) / 5);
  return k * 10;
}
