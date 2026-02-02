import type { Money } from "../schemas";
/**
 * Assert that two Money values have the same currency and scale
 * @throws CurrencyMismatchError if currencies don't match
 * @throws ScaleMismatchError if scales don't match
 */
export declare function assertSameCurrency(a: Money, b: Money): void;
/**
 * Assert all Money values in an array have the same currency and scale
 * @throws CurrencyMismatchError if currencies don't match
 * @throws ScaleMismatchError if scales don't match
 */
export declare function assertAllSameCurrency(moneys: Money[]): void;
