import { type ArithmeticInput, ArithmeticInputSchema } from "./schemas";

/**
 * Compare two scaled bigint values
 *
 * @param input - Arithmetic operation parameters
 * @param input.a - First value to compare
 * @param input.b - Second value to compare
 * @param input.scale - Number of decimal places both operands use
 * @returns -1 if a < b, 0 if a = b, 1 if a > b
 *
 * @example
 * // Compare 1.23 and 4.56 (scale 2)
 * compare({ a: 123n, b: 456n, scale: 2 })
 * // Result: -1
 */
export function compare(input: ArithmeticInput): -1 | 0 | 1 {
   const { a, b } = ArithmeticInputSchema.parse(input);
   if (a < b) return -1;
   if (a > b) return 1;
   return 0;
}

/**
 * Check if two scaled bigint values are equal
 *
 * @param input - Arithmetic operation parameters
 * @param input.a - First value to compare
 * @param input.b - Second value to compare
 * @param input.scale - Number of decimal places both operands use
 * @returns true if a = b, false otherwise
 *
 * @example
 * // Check if 1.23 equals 1.23 (scale 2)
 * equals({ a: 123n, b: 123n, scale: 2 })
 * // Result: true
 */
export function equals(input: ArithmeticInput): boolean {
   const { a, b } = ArithmeticInputSchema.parse(input);
   return a === b;
}

/**
 * Check if first value is greater than second value
 *
 * @param input - Arithmetic operation parameters
 * @param input.a - First value to compare
 * @param input.b - Second value to compare
 * @param input.scale - Number of decimal places both operands use
 * @returns true if a > b, false otherwise
 *
 * @example
 * // Check if 4.56 > 1.23 (scale 2)
 * greaterThan({ a: 456n, b: 123n, scale: 2 })
 * // Result: true
 */
export function greaterThan(input: ArithmeticInput): boolean {
   const { a, b } = ArithmeticInputSchema.parse(input);
   return a > b;
}

/**
 * Check if first value is greater than or equal to second value
 *
 * @param input - Arithmetic operation parameters
 * @param input.a - First value to compare
 * @param input.b - Second value to compare
 * @param input.scale - Number of decimal places both operands use
 * @returns true if a >= b, false otherwise
 *
 * @example
 * // Check if 1.23 >= 1.23 (scale 2)
 * greaterThanOrEqual({ a: 123n, b: 123n, scale: 2 })
 * // Result: true
 */
export function greaterThanOrEqual(input: ArithmeticInput): boolean {
   const { a, b } = ArithmeticInputSchema.parse(input);
   return a >= b;
}

/**
 * Check if first value is less than second value
 *
 * @param input - Arithmetic operation parameters
 * @param input.a - First value to compare
 * @param input.b - Second value to compare
 * @param input.scale - Number of decimal places both operands use
 * @returns true if a < b, false otherwise
 *
 * @example
 * // Check if 1.23 < 4.56 (scale 2)
 * lessThan({ a: 123n, b: 456n, scale: 2 })
 * // Result: true
 */
export function lessThan(input: ArithmeticInput): boolean {
   const { a, b } = ArithmeticInputSchema.parse(input);
   return a < b;
}

/**
 * Check if first value is less than or equal to second value
 *
 * @param input - Arithmetic operation parameters
 * @param input.a - First value to compare
 * @param input.b - Second value to compare
 * @param input.scale - Number of decimal places both operands use
 * @returns true if a <= b, false otherwise
 *
 * @example
 * // Check if 1.23 <= 1.23 (scale 2)
 * lessThanOrEqual({ a: 123n, b: 123n, scale: 2 })
 * // Result: true
 */
export function lessThanOrEqual(input: ArithmeticInput): boolean {
   const { a, b } = ArithmeticInputSchema.parse(input);
   return a <= b;
}

/**
 * Check if a scaled bigint value is zero
 *
 * @param input - Arithmetic operation parameters
 * @param input.a - The value to check
 * @param input.b - Unused (required by schema, pass 0n)
 * @param input.scale - Number of decimal places
 * @returns true if value is zero, false otherwise
 *
 * @example
 * // Check if 0.00 is zero (scale 2)
 * isZero({ a: 0n, b: 0n, scale: 2 })
 * // Result: true
 */
export function isZero(input: ArithmeticInput): boolean {
   const { a } = ArithmeticInputSchema.parse(input);
   return a === 0n;
}

/**
 * Check if a scaled bigint value is positive
 *
 * @param input - Arithmetic operation parameters
 * @param input.a - The value to check
 * @param input.b - Unused (required by schema, pass 0n)
 * @param input.scale - Number of decimal places
 * @returns true if value is positive, false otherwise
 *
 * @example
 * // Check if 1.23 is positive (scale 2)
 * isPositive({ a: 123n, b: 0n, scale: 2 })
 * // Result: true
 */
export function isPositive(input: ArithmeticInput): boolean {
   const { a } = ArithmeticInputSchema.parse(input);
   return a > 0n;
}

/**
 * Check if a scaled bigint value is negative
 *
 * @param input - Arithmetic operation parameters
 * @param input.a - The value to check
 * @param input.b - Unused (required by schema, pass 0n)
 * @param input.scale - Number of decimal places
 * @returns true if value is negative, false otherwise
 *
 * @example
 * // Check if -1.23 is negative (scale 2)
 * isNegative({ a: -123n, b: 0n, scale: 2 })
 * // Result: true
 */
export function isNegative(input: ArithmeticInput): boolean {
   const { a } = ArithmeticInputSchema.parse(input);
   return a < 0n;
}
