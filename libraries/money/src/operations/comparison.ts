import { assertSameCurrency } from "../core/assertions";
import type { Money } from "../schemas";

/**
 * Check if two Money values are equal
 *
 * @example
 * equals(of("10.00", "USD"), of("10.00", "USD")) // true
 */
export function equals(a: Money, b: Money): boolean {
   assertSameCurrency(a, b);
   return a.amount === b.amount;
}

/**
 * Check if first Money is greater than second
 *
 * @example
 * greaterThan(of("20.00", "USD"), of("10.00", "USD")) // true
 */
export function greaterThan(a: Money, b: Money): boolean {
   assertSameCurrency(a, b);
   return a.amount > b.amount;
}

/**
 * Check if first Money is greater than or equal to second
 */
export function greaterThanOrEqual(a: Money, b: Money): boolean {
   assertSameCurrency(a, b);
   return a.amount >= b.amount;
}

/**
 * Check if first Money is less than second
 *
 * @example
 * lessThan(of("10.00", "USD"), of("20.00", "USD")) // true
 */
export function lessThan(a: Money, b: Money): boolean {
   assertSameCurrency(a, b);
   return a.amount < b.amount;
}

/**
 * Check if first Money is less than or equal to second
 */
export function lessThanOrEqual(a: Money, b: Money): boolean {
   assertSameCurrency(a, b);
   return a.amount <= b.amount;
}

/**
 * Check if Money is positive (amount > 0)
 *
 * @example
 * isPositive(of("10.00", "USD")) // true
 * isPositive(of("-10.00", "USD")) // false
 */
export function isPositive(money: Money): boolean {
   return money.amount > 0n;
}

/**
 * Check if Money is negative (amount < 0)
 *
 * @example
 * isNegative(of("-10.00", "USD")) // true
 * isNegative(of("10.00", "USD")) // false
 */
export function isNegative(money: Money): boolean {
   return money.amount < 0n;
}

/**
 * Check if Money is zero (amount === 0)
 *
 * @example
 * isZero(of("0.00", "USD")) // true
 */
export function isZero(money: Money): boolean {
   return money.amount === 0n;
}

/**
 * Compare two Money values
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 *
 * @example
 * compare(of("10.00", "USD"), of("20.00", "USD")) // -1
 * compare(of("20.00", "USD"), of("10.00", "USD")) // 1
 * compare(of("10.00", "USD"), of("10.00", "USD")) // 0
 */
export function compare(a: Money, b: Money): -1 | 0 | 1 {
   assertSameCurrency(a, b);
   if (a.amount < b.amount) return -1;
   if (a.amount > b.amount) return 1;
   return 0;
}
