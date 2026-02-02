import { bankersRound } from "@f-o-t/bigint";

export { bankersRound };

/**
 * Round a bigint value with extended precision back to a target scale
 *
 * @param value - Value with extended precision
 * @param fromScale - Current scale (precision) of the value
 * @param toScale - Target scale (currency's decimal places)
 * @returns Rounded value at target scale
 */
export function roundToScale(
   value: bigint,
   fromScale: number,
   toScale: number,
): bigint {
   if (fromScale <= toScale) {
      // Need to scale up - no rounding needed
      const factor = 10n ** BigInt(toScale - fromScale);
      return value * factor;
   }

   // Need to scale down with banker's rounding
   const divisor = 10n ** BigInt(fromScale - toScale);
   return bankersRound(value, divisor);
}

/**
 * Extended precision for intermediate calculations
 * Using 18 decimal places to handle even ETH-level precision
 */
export const EXTENDED_PRECISION = 18;

/**
 * Scale factor for extended precision calculations
 */
export const PRECISION_FACTOR = 10n ** BigInt(EXTENDED_PRECISION);
