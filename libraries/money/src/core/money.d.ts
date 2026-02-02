import type { Money, RoundingMode } from "../schemas";
/**
 * Create Money from a decimal amount
 *
 * By default, excess decimal places are TRUNCATED, not rounded.
 * Use roundingMode parameter or ofRounded() for rounding behavior.
 *
 * IMPORTANT: Always pass strings for amounts to avoid floating-point precision issues.
 * Passing numbers like (0.1 + 0.2) will produce incorrect results due to JavaScript
 * floating-point arithmetic limitations.
 *
 * @param amount - Decimal amount as STRING (preferred) or number
 * @param currency - ISO 4217 currency code
 * @param roundingMode - How to handle excess decimal places (default: "truncate")
 * @returns Money instance
 *
 * @example
 * // CORRECT - String amounts are precise
 * of("123.45", "USD")
 * of("0.1", "USD")
 *
 * // AVOID - Number literals work but strings are safer
 * of(123.45, "USD")
 *
 * // WRONG - Computed numbers lose precision
 * of(0.1 + 0.2, "USD")  // Results in 0.30000000000000004
 */
export declare function of(amount: number | string, currency: string, roundingMode?: RoundingMode): Money;
/**
 * Create Money from a decimal amount with rounding
 *
 * Convenience function that rounds excess decimal places using banker's rounding.
 * Equivalent to: of(amount, currency, "round")
 *
 * @param amount - Decimal amount as string or number
 * @param currency - ISO 4217 currency code
 * @returns Money instance with rounded amount
 *
 * @example
 * ofRounded("10.999", "USD")  // $11.00
 * ofRounded("10.995", "USD")  // $11.00 (rounds to even)
 * ofRounded("10.994", "USD")  // $10.99
 */
export declare function ofRounded(amount: number | string, currency: string): Money;
/**
 * Create Money from minor units (cents, pence, etc.)
 *
 * Use this when you already have the amount in the smallest currency unit.
 *
 * @param minorUnits - Amount in minor units (e.g., cents)
 * @param currency - ISO 4217 currency code
 * @returns Money instance
 *
 * @example
 * fromMinorUnits(12345, "USD")  // $123.45
 * fromMinorUnits(12345n, "USD") // Same, using BigInt
 * fromMinorUnits(100, "JPY")    // ¥100 (no decimal places)
 */
export declare function fromMinorUnits(minorUnits: number | bigint, currency: string): Money;
/**
 * Create zero Money for a currency
 *
 * @param currency - ISO 4217 currency code
 * @returns Money instance with zero amount
 *
 * @example
 * zero("USD") // $0.00
 * zero("JPY") // ¥0
 */
export declare function zero(currency: string): Money;
/**
 * Create Money from major units (dollars, reais, etc.)
 *
 * Convenience alias for `of` to make intent clearer.
 *
 * @param amount - Amount in major units
 * @param currency - ISO 4217 currency code
 * @returns Money instance
 */
export declare function fromMajorUnits(amount: number | string, currency: string): Money;
