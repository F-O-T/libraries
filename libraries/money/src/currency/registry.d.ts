import type { Currency } from "./types";
/**
 * Get a currency by its code
 *
 * @param code - ISO 4217 currency code (case-insensitive)
 * @returns Currency definition
 * @throws UnknownCurrencyError if currency is not found
 */
export declare function getCurrency(code: string): Currency;
/**
 * Register a custom currency
 *
 * Can be used to add new currencies or override existing ones.
 *
 * @param currency - Currency definition to register
 */
export declare function registerCurrency(currency: Currency): void;
/**
 * Check if a currency code is registered
 *
 * @param code - ISO 4217 currency code (case-insensitive)
 * @returns true if currency exists
 */
export declare function hasCurrency(code: string): boolean;
/**
 * Get all registered currencies (both ISO and custom)
 *
 * @returns Record of all currencies keyed by code
 */
export declare function getAllCurrencies(): Record<string, Currency>;
/**
 * Clear all custom currencies (useful for testing)
 */
export declare function clearCustomCurrencies(): void;
