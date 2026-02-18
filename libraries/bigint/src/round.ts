import { type ConvertScaleInput, ConvertScaleInputSchema } from "./schemas";

/**
 * Round using banker's rounding (round half to even)
 *
 * When the value is exactly halfway between two integers,
 * rounds to the nearest even number.
 *
 * @param value - The value to round
 * @param divisor - The divisor to use for rounding
 * @returns The rounded result
 * @throws Error if divisor is zero
 *
 * @example
 * bankersRound(15n, 10n) // 2n (1.5 → 2, even)
 * bankersRound(25n, 10n) // 2n (2.5 → 2, even)
 * bankersRound(35n, 10n) // 4n (3.5 → 4, even)
 */
export function bankersRound(value: bigint, divisor: bigint): bigint {
   if (divisor === 0n) {
      throw new Error("Division by zero");
   }

   const quotient = value / divisor;
   const remainder = value % divisor;

   // No remainder - exact division
   if (remainder === 0n) {
      return quotient;
   }

   // Get absolute remainder for comparison
   const absRemainder = remainder < 0n ? -remainder : remainder;
   const absDivisor = divisor < 0n ? -divisor : divisor;

   // Check if exactly halfway
   const isHalfway = absRemainder * 2n === absDivisor;

   if (isHalfway) {
      // Round to even
      const absQuotient = quotient < 0n ? -quotient : quotient;
      const isQuotientEven = absQuotient % 2n === 0n;

      if (isQuotientEven) {
         // Already even, round toward zero
         return quotient;
      } else {
         // Odd, round away from zero to make even
         if (value < 0n) {
            return quotient - 1n;
         } else {
            return quotient + 1n;
         }
      }
   }

   // Not halfway - standard rounding
   // If abs(remainder) > divisor/2, round away from zero
   if (absRemainder * 2n > absDivisor) {
      if (value < 0n) {
         return quotient - 1n;
      } else {
         return quotient + 1n;
      }
   }

   // Otherwise round toward zero
   return quotient;
}

/**
 * Round toward positive infinity (ceiling)
 *
 * Always rounds toward positive infinity:
 * - Positive values with remainders round up
 * - Negative values with remainders round toward zero
 *
 * @param value - The value to round
 * @param divisor - The divisor to use for rounding
 * @returns The rounded result (ceiling)
 * @throws Error if divisor is zero
 *
 * @example
 * roundUp(11n, 10n)   // 2n  (ceiling of 1.1)
 * roundUp(-11n, 10n)  // -1n (ceiling of -1.1)
 */
export function roundUp(value: bigint, divisor: bigint): bigint {
   if (divisor === 0n) {
      throw new Error("Division by zero");
   }

   const quotient = value / divisor;
   const remainder = value % divisor;

   // No remainder - exact division
   if (remainder === 0n) {
      return quotient;
   }

   // For ceiling, we round up (toward positive infinity)
   // If positive and has remainder, add 1 to quotient
   // If negative and has remainder, quotient is already correct (truncates toward zero which is toward +inf)
   if (value > 0n) {
      return quotient + 1n;
   } else {
      return quotient;
   }
}

/**
 * Round toward negative infinity (floor)
 *
 * Always rounds toward negative infinity:
 * - Positive values with remainders round toward zero
 * - Negative values with remainders round away from zero
 *
 * @param value - The value to round
 * @param divisor - The divisor to use for rounding
 * @returns The rounded result (floor)
 * @throws Error if divisor is zero
 *
 * @example
 * roundDown(11n, 10n)   // 1n  (floor of 1.1)
 * roundDown(-11n, 10n)  // -2n (floor of -1.1)
 */
export function roundDown(value: bigint, divisor: bigint): bigint {
   if (divisor === 0n) {
      throw new Error("Division by zero");
   }

   const quotient = value / divisor;
   const remainder = value % divisor;

   // No remainder - exact division
   if (remainder === 0n) {
      return quotient;
   }

   // For floor, we round down (toward negative infinity)
   // If positive and has remainder, quotient is already correct (truncates toward zero which is toward -inf)
   // If negative and has remainder, subtract 1 from quotient
   if (value < 0n) {
      return quotient - 1n;
   } else {
      return quotient;
   }
}

/**
 * Convert a value from one scale to another
 *
 * When scaling up (increasing precision), multiplies by 10^(toScale - fromScale)
 * When scaling down (decreasing precision), divides and applies rounding mode
 *
 * @param input - Conversion parameters
 * @param input.value - The bigint value to convert
 * @param input.fromScale - Current number of decimal places
 * @param input.toScale - Target number of decimal places
 * @param input.roundingMode - Rounding mode for scaling down (default: "truncate")
 * @returns The value converted to the new scale
 *
 * @example
 * // Scale up: 1.23 (scale 2) → 1.2300 (scale 4)
 * convertScale({ value: 123n, fromScale: 2, toScale: 4 })
 * // Result: 12300n
 *
 * // Scale down with truncation: 1.2345 (scale 4) → 1.23 (scale 2)
 * convertScale({ value: 12345n, fromScale: 4, toScale: 2 })
 * // Result: 123n
 *
 * // Scale down with rounding: 1.2350 (scale 4) → 1.24 (scale 2)
 * convertScale({ value: 12350n, fromScale: 4, toScale: 2, roundingMode: "round" })
 * // Result: 124n (banker's rounding: 123.50 → 124, even)
 */
export function convertScale(input: ConvertScaleInput): bigint {
   // Validate input
   const {
      value,
      fromScale,
      toScale,
      roundingMode = "truncate",
   } = ConvertScaleInputSchema.parse(input);

   // Same scale - no conversion needed
   if (fromScale === toScale) {
      return value;
   }

   // Scaling up - multiply by power of 10
   if (toScale > fromScale) {
      const scaleDiff = toScale - fromScale;
      const multiplier = 10n ** BigInt(scaleDiff);
      return value * multiplier;
   }

   // Scaling down - divide with rounding
   const scaleDiff = fromScale - toScale;
   const divisor = 10n ** BigInt(scaleDiff);

   switch (roundingMode) {
      case "truncate":
         return value / divisor;
      case "round":
         return bankersRound(value, divisor);
      case "ceil":
         return roundUp(value, divisor);
      case "floor":
         return roundDown(value, divisor);
      default:
         // This should never happen due to Zod validation
         throw new Error(`Unknown rounding mode: ${roundingMode}`);
   }
}
