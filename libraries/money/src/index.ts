// =============================================================================
// @f-o-t/money - Type-safe money handling with BigInt precision
// =============================================================================

// Re-export from organized modules
export * from "./exports/core";
export * from "./exports/operations";
export * from "./exports/formatting";
export * from "./exports/serialization";

// Currency registry
export { getCurrency, hasCurrency, registerCurrency, clearCustomCurrencies, getAllCurrencies } from "./currency/registry";
export { ISO_4217_CURRENCIES } from "./currency/currencies";
export type { Currency } from "./currency/types";

// Schemas
export {
   MoneySchema,
   MoneyInputSchema,
   MoneyInternalSchema,
   CurrencyCodeSchema,
   CurrencySchema,
   DatabaseMoneySchema,
   FormatOptionsSchema,
   AllocationRatiosSchema,
   AmountStringSchema,
   type MoneyInput,
   type AllocationRatios,
   type CurrencyInput,
} from "./schemas";

// Errors
export {
   MoneyError,
   CurrencyMismatchError,
   InvalidAmountError,
   DivisionByZeroError,
   UnknownCurrencyError,
   OverflowError,
   ScaleMismatchError,
} from "./errors";

// Additional types from schemas (not re-exported by submodules)
export type { FormatOptions } from "./schemas";
