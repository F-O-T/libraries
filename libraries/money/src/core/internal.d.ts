import type { Money, RoundingMode } from "../schemas";
/**
 * Create an immutable Money object
 *
 * @param amount - Amount in minor units as BigInt
 * @param currency - ISO 4217 currency code (uppercase)
 * @param scale - Number of decimal places for this currency
 * @returns Frozen Money object
 */
export declare function createMoney(amount: bigint, currency: string, scale: number): Money;
/**
 * Parse a decimal string to minor units
 *
 * @param amountStr - Decimal string (e.g., "123.45", "100", "-50.5")
 * @param scale - Target scale (decimal places)
 * @param roundingMode - How to handle excess decimal places (default: "truncate")
 * @returns Amount in minor units as BigInt
 */
export declare function parseDecimalToMinorUnits(amountStr: string, scale: number, roundingMode?: RoundingMode): bigint;
/**
 * Convert minor units to decimal string
 *
 * @param amount - Amount in minor units
 * @param scale - Number of decimal places
 * @returns Decimal string representation
 */
export declare function minorUnitsToDecimal(amount: bigint, scale: number): string;
/**
 * Maximum of two BigInt values
 */
export declare function maxBigInt(a: bigint, b: bigint): bigint;
/**
 * Minimum of two BigInt values
 */
export declare function minBigInt(a: bigint, b: bigint): bigint;
