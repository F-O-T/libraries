import type { Money } from "../schemas";
/**
 * Add two Money values
 *
 * @param a - First Money value
 * @param b - Second Money value (must be same currency)
 * @returns Sum of a and b
 * @throws CurrencyMismatchError if currencies don't match
 *
 * @example
 * add(of("10.50", "USD"), of("5.25", "USD")) // $15.75
 */
export declare function add(a: Money, b: Money): Money;
/**
 * Subtract one Money value from another
 *
 * @param a - Money value to subtract from
 * @param b - Money value to subtract (must be same currency)
 * @returns Difference of a - b
 * @throws CurrencyMismatchError if currencies don't match
 *
 * @example
 * subtract(of("10.50", "USD"), of("5.25", "USD")) // $5.25
 */
export declare function subtract(a: Money, b: Money): Money;
/**
 * Multiply Money by a factor
 *
 * Uses banker's rounding for the final result.
 *
 * @param money - Money value to multiply
 * @param factor - Multiplication factor (number or string for precision)
 * @returns Product with banker's rounding applied
 *
 * @example
 * multiply(of("10.00", "USD"), 1.5)    // $15.00
 * multiply(of("10.00", "USD"), "1.5")  // $15.00 (string for precision)
 * multiply(of("33.33", "USD"), 3)      // $99.99
 */
export declare function multiply(money: Money, factor: number | string): Money;
/**
 * Divide Money by a divisor
 *
 * Uses banker's rounding for the final result.
 *
 * @param money - Money value to divide
 * @param divisor - Division factor (number or string for precision)
 * @returns Quotient with banker's rounding applied
 * @throws DivisionByZeroError if divisor is zero
 *
 * @example
 * divide(of("10.00", "USD"), 3)    // $3.33 (banker's rounding)
 * divide(of("100.00", "USD"), 4)   // $25.00
 */
export declare function divide(money: Money, divisor: number | string): Money;
/**
 * Calculate a percentage of Money
 *
 * @param money - Money value
 * @param percent - Percentage (e.g., 15 for 15%)
 * @returns Percentage amount with banker's rounding
 *
 * @example
 * percentage(of("100.00", "USD"), 15)   // $15.00
 * percentage(of("200.00", "USD"), 7.5)  // $15.00
 */
export declare function percentage(money: Money, percent: number): Money;
/**
 * Negate a Money value
 *
 * @param money - Money value to negate
 * @returns Money with opposite sign
 *
 * @example
 * negate(of("10.00", "USD"))   // -$10.00
 * negate(of("-5.00", "USD"))   // $5.00
 */
export declare function negate(money: Money): Money;
/**
 * Get absolute value of Money
 *
 * @param money - Money value
 * @returns Money with positive amount
 *
 * @example
 * absolute(of("-10.00", "USD"))  // $10.00
 * absolute(of("10.00", "USD"))   // $10.00
 */
export declare function absolute(money: Money): Money;
