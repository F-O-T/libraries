import { type Money } from "../schemas";
/**
 * Convert Money to minor units as a number
 *
 * Use this when you need to store the amount in a database column
 * that doesn't support BigInt, or when interfacing with APIs that
 * expect number types.
 *
 * @param money - Money value
 * @returns Amount in minor units (cents) as a number
 * @throws OverflowError if the value exceeds Number.MAX_SAFE_INTEGER
 *
 * @example
 * toMinorUnits(of("123.45", "USD"))  // 12345
 * toMinorUnits(of("100", "JPY"))     // 100
 */
export declare function toMinorUnits(money: Money): number;
/**
 * Convert Money to minor units as a BigInt
 *
 * Use this when you need the raw BigInt value without any conversion.
 *
 * @param money - Money value
 * @returns Amount in minor units (cents) as BigInt
 *
 * @example
 * toMinorUnitsBigInt(of("123.45", "USD"))  // 12345n
 */
export declare function toMinorUnitsBigInt(money: Money): bigint;
/**
 * Convert Money to major units as a number
 *
 * @deprecated Use toMajorUnitsString() for precision-safe conversion.
 * This function may lose precision for large amounts.
 *
 * @param money - Money value
 * @returns Amount in major units (dollars, reais, etc.) as a number
 *
 * @example
 * toMajorUnits(of("123.45", "USD"))  // 123.45
 * toMajorUnits(of("100", "JPY"))     // 100
 */
export declare function toMajorUnits(money: Money): number;
/**
 * Convert Money to major units as a string (precision-safe)
 *
 * Use this for precise decimal representation without precision loss.
 *
 * @param money - Money value
 * @returns Amount in major units as a string (e.g., "123.45")
 *
 * @example
 * toMajorUnitsString(of("123.45", "USD"))  // "123.45"
 * toMajorUnitsString(of("999999999999999.99", "USD"))  // "999999999999999.99"
 */
export declare function toMajorUnitsString(money: Money): string;
/**
 * Convert Money to a string of minor units
 *
 * Useful for database storage or APIs that accept string representations.
 *
 * @param money - Money value
 * @returns Amount in minor units as a string
 *
 * @example
 * toMinorUnitsString(of("123.45", "USD"))  // "12345"
 */
export declare function toMinorUnitsString(money: Money): string;
