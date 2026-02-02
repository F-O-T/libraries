/**
 * Base error class for all money-related errors
 */
export declare class MoneyError extends Error {
    constructor(message: string);
}
/**
 * Error thrown when attempting operations on different currencies
 */
export declare class CurrencyMismatchError extends MoneyError {
    readonly currencyA: string;
    readonly currencyB: string;
    constructor(message: string, currencyA: string, currencyB: string);
    static create(currencyA: string, currencyB: string): CurrencyMismatchError;
}
/**
 * Error thrown when an invalid amount is provided
 */
export declare class InvalidAmountError extends MoneyError {
    constructor(message: string);
}
/**
 * Error thrown when attempting to divide by zero
 */
export declare class DivisionByZeroError extends MoneyError {
    constructor(message?: string);
}
/**
 * Error thrown when a currency code is not found in the registry
 */
export declare class UnknownCurrencyError extends MoneyError {
    readonly currencyCode?: string | undefined;
    constructor(message: string, currencyCode?: string | undefined);
}
/**
 * Error thrown when a value exceeds safe integer range
 */
export declare class OverflowError extends MoneyError {
    constructor(message?: string);
}
/**
 * Error thrown when Money values have inconsistent scales for the same currency
 */
export declare class ScaleMismatchError extends MoneyError {
    readonly currency: string;
    readonly scaleA: number;
    readonly scaleB: number;
    constructor(message: string, currency: string, scaleA: number, scaleB: number);
    static create(currency: string, scaleA: number, scaleB: number): ScaleMismatchError;
}
