import type { Money, RoundingMode } from "../types";
import { bankersRound } from "./rounding";
import { parseToBigInt, formatFromBigInt } from "@f-o-t/bigint";

/**
 * Create an immutable Money object
 *
 * @param amount - Amount in minor units as BigInt
 * @param currency - ISO 4217 currency code (uppercase)
 * @param scale - Number of decimal places for this currency
 * @returns Frozen Money object
 */
export function createMoney(
   amount: bigint,
   currency: string,
   scale: number,
): Money {
   return Object.freeze({ amount, currency, scale });
}

/**
 * Parse a decimal string to minor units
 *
 * @param amountStr - Decimal string (e.g., "123.45", "100", "-50.5")
 * @param scale - Target scale (decimal places)
 * @param roundingMode - How to handle excess decimal places (default: "truncate")
 * @returns Amount in minor units as BigInt
 */
export function parseDecimalToMinorUnits(
   amountStr: string,
   scale: number,
   roundingMode: RoundingMode = "truncate",
): bigint {
   return parseToBigInt({ value: amountStr, scale, roundingMode });
}

/**
 * Convert minor units to decimal string
 *
 * @param amount - Amount in minor units
 * @param scale - Number of decimal places
 * @returns Decimal string representation
 */
export function minorUnitsToDecimal(amount: bigint, scale: number): string {
   return formatFromBigInt({ value: amount, scale, trimTrailingZeros: false });
}

/**
 * Maximum of two BigInt values
 */
export function maxBigInt(a: bigint, b: bigint): bigint {
   return a > b ? a : b;
}

/**
 * Minimum of two BigInt values
 */
export function minBigInt(a: bigint, b: bigint): bigint {
   return a < b ? a : b;
}
