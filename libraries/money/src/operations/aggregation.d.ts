import type { Money } from "../schemas";
/**
 * Sum an array of Money values
 *
 * @param moneys - Array of Money values (must all be same currency)
 * @returns Sum of all values
 * @throws CurrencyMismatchError if currencies don't match
 * @throws InvalidAmountError if array is empty
 *
 * @example
 * sum([of("10.00", "USD"), of("20.00", "USD"), of("30.00", "USD")]) // $60.00
 */
export declare function sum(moneys: Money[]): Money;
/**
 * Sum an array of Money values, returning zero if empty
 *
 * @param moneys - Array of Money values
 * @param currency - Currency to use for zero if array is empty
 * @returns Sum of all values, or zero of the specified currency
 *
 * @example
 * sumOrZero([of("10.00", "USD")], "USD")  // $10.00
 * sumOrZero([], "USD")                     // $0.00
 */
export declare function sumOrZero(moneys: Money[], currency: string): Money;
/**
 * Find the minimum Money value
 *
 * @param moneys - Array of Money values (must all be same currency)
 * @returns Minimum value
 * @throws CurrencyMismatchError if currencies don't match
 * @throws InvalidAmountError if array is empty
 *
 * @example
 * min([of("10.00", "USD"), of("5.00", "USD"), of("20.00", "USD")]) // $5.00
 */
export declare function min(moneys: Money[]): Money;
/**
 * Find the maximum Money value
 *
 * @param moneys - Array of Money values (must all be same currency)
 * @returns Maximum value
 * @throws CurrencyMismatchError if currencies don't match
 * @throws InvalidAmountError if array is empty
 *
 * @example
 * max([of("10.00", "USD"), of("5.00", "USD"), of("20.00", "USD")]) // $20.00
 */
export declare function max(moneys: Money[]): Money;
/**
 * Calculate the average of Money values
 *
 * Uses banker's rounding for the result.
 *
 * @param moneys - Array of Money values (must all be same currency)
 * @returns Average value with banker's rounding
 * @throws CurrencyMismatchError if currencies don't match
 * @throws InvalidAmountError if array is empty
 *
 * @example
 * average([of("10.00", "USD"), of("20.00", "USD"), of("30.00", "USD")]) // $20.00
 * average([of("10.00", "USD"), of("10.00", "USD"), of("10.00", "USD")]) // $10.00
 * average([of("1.00", "USD"), of("2.00", "USD")])                        // $1.50
 */
export declare function average(moneys: Money[]): Money;
/**
 * Calculate median of Money values
 *
 * For even-length arrays, returns the average of the two middle values.
 *
 * @param moneys - Array of Money values (must all be same currency)
 * @returns Median value
 * @throws CurrencyMismatchError if currencies don't match
 * @throws InvalidAmountError if array is empty
 *
 * @example
 * median([of("1.00", "USD"), of("2.00", "USD"), of("3.00", "USD")]) // $2.00
 * median([of("1.00", "USD"), of("2.00", "USD"), of("3.00", "USD"), of("4.00", "USD")]) // $2.50
 */
export declare function median(moneys: Money[]): Money;
