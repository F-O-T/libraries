import {
  ArithmeticInputSchema,
  DivideInputSchema,
  type ArithmeticInput,
  type DivideInput,
} from "./schemas";
import { bankersRound, roundUp, roundDown } from "./round";

/**
 * Add two scaled bigint values
 *
 * @param input - Arithmetic operation parameters
 * @param input.a - First operand (scaled bigint)
 * @param input.b - Second operand (scaled bigint)
 * @param input.scale - Number of decimal places both operands use
 * @returns The sum a + b
 *
 * @example
 * // 1.23 + 4.56 = 5.79 (scale 2)
 * add({ a: 123n, b: 456n, scale: 2 })
 * // Result: 579n
 */
export function add(input: ArithmeticInput): bigint {
  const { a, b } = ArithmeticInputSchema.parse(input);
  return a + b;
}

/**
 * Subtract two scaled bigint values
 *
 * @param input - Arithmetic operation parameters
 * @param input.a - Minuend (scaled bigint)
 * @param input.b - Subtrahend (scaled bigint)
 * @param input.scale - Number of decimal places both operands use
 * @returns The difference a - b
 *
 * @example
 * // 5.79 - 1.23 = 4.56 (scale 2)
 * subtract({ a: 579n, b: 123n, scale: 2 })
 * // Result: 456n
 */
export function subtract(input: ArithmeticInput): bigint {
  const { a, b } = ArithmeticInputSchema.parse(input);
  return a - b;
}

/**
 * Multiply two scaled bigint values
 *
 * When multiplying two values at scale N, the raw result is at scale 2N.
 * This function scales the result back down to N by dividing by 10^N.
 *
 * @param input - Arithmetic operation parameters
 * @param input.a - First factor (scaled bigint)
 * @param input.b - Second factor (scaled bigint)
 * @param input.scale - Number of decimal places both operands use
 * @returns The product (a * b) scaled back to original scale (truncated)
 *
 * @example
 * // 1.23 * 4.56 = 5.6088 → 5.60 after scaling back (scale 2)
 * // 123n * 456n = 56088n, then / 100n = 560n (truncated)
 * multiply({ a: 123n, b: 456n, scale: 2 })
 * // Result: 560n
 */
export function multiply(input: ArithmeticInput): bigint {
  const { a, b, scale } = ArithmeticInputSchema.parse(input);
  const product = a * b;
  const divisor = 10n ** BigInt(scale);
  return product / divisor;
}

/**
 * Divide two scaled bigint values with optional rounding
 *
 * To maintain precision, this function scales up the dividend by 10^scale
 * before performing the division, then applies the specified rounding mode.
 *
 * @param input - Division operation parameters
 * @param input.a - Dividend (scaled bigint)
 * @param input.b - Divisor (scaled bigint, must not be zero)
 * @param input.scale - Number of decimal places both operands use
 * @param input.roundingMode - Rounding mode to apply (default: "truncate")
 * @returns The quotient a / b with rounding applied
 * @throws Error if b is zero
 *
 * @example
 * // 1.00 / 3.00 = 0.33... → 0.33 with truncate (scale 2)
 * // (100n * 100n) / 300n = 10000n / 300n = 33n
 * divide({ a: 100n, b: 300n, scale: 2 })
 * // Result: 33n
 *
 * @example
 * // With rounding: 1.00 / 3.00 = 0.33... → 0.34 with ceil
 * divide({ a: 100n, b: 300n, scale: 2, roundingMode: "ceil" })
 * // Result: 34n
 */
export function divide(input: DivideInput): bigint {
  const { a, b, scale, roundingMode = "truncate" } = DivideInputSchema.parse(input);

  // Scale up the dividend to maintain precision
  const scaledDividend = a * (10n ** BigInt(scale));

  // Apply rounding based on mode
  switch (roundingMode) {
    case "truncate":
      return scaledDividend / b;
    case "round":
      return bankersRound(scaledDividend, b);
    case "ceil":
      return roundUp(scaledDividend, b);
    case "floor":
      return roundDown(scaledDividend, b);
    default:
      // This should never happen due to Zod validation
      throw new Error(`Unknown rounding mode: ${roundingMode}`);
  }
}

/**
 * Get the absolute value of a scaled bigint
 *
 * @param input - Arithmetic operation parameters
 * @param input.a - The value to get absolute value of
 * @param input.b - Unused (required by schema, pass 0n)
 * @param input.scale - Number of decimal places
 * @returns The absolute value of a
 *
 * @example
 * // abs(-1.23) = 1.23 (scale 2)
 * abs({ a: -123n, b: 0n, scale: 2 })
 * // Result: 123n
 */
export function abs(input: ArithmeticInput): bigint {
  const { a } = ArithmeticInputSchema.parse(input);
  return a < 0n ? -a : a;
}

/**
 * Get the minimum of two scaled bigint values
 *
 * @param input - Arithmetic operation parameters
 * @param input.a - First value to compare
 * @param input.b - Second value to compare
 * @param input.scale - Number of decimal places both operands use
 * @returns The smaller of a and b
 *
 * @example
 * // min(1.23, 4.56) = 1.23 (scale 2)
 * min({ a: 123n, b: 456n, scale: 2 })
 * // Result: 123n
 */
export function min(input: ArithmeticInput): bigint {
  const { a, b } = ArithmeticInputSchema.parse(input);
  return a < b ? a : b;
}

/**
 * Get the maximum of two scaled bigint values
 *
 * @param input - Arithmetic operation parameters
 * @param input.a - First value to compare
 * @param input.b - Second value to compare
 * @param input.scale - Number of decimal places both operands use
 * @returns The larger of a and b
 *
 * @example
 * // max(1.23, 4.56) = 4.56 (scale 2)
 * max({ a: 123n, b: 456n, scale: 2 })
 * // Result: 456n
 */
export function max(input: ArithmeticInput): bigint {
  const { a, b } = ArithmeticInputSchema.parse(input);
  return a > b ? a : b;
}
