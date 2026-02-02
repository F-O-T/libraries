import { z } from "zod";

// =============================================================================
// Rounding Mode
// =============================================================================

/**
 * Rounding mode for amount parsing
 */
export type RoundingMode = "truncate" | "round";

// =============================================================================
// Currency Schemas
// =============================================================================

/**
 * Schema for validating ISO 4217 currency codes
 *
 * - Exactly 3 characters
 * - Uppercase letters only
 */
export const CurrencyCodeSchema = z
   .string()
   .length(3, "Currency code must be exactly 3 characters")
   .regex(/^[A-Z]{3}$/, "Currency code must be 3 uppercase letters")
   .describe("ISO 4217 currency code");

/**
 * Currency type representing a currency definition
 */
export type Currency = {
   code: string;
   numericCode: number;
   name: string;
   decimalPlaces: number;
   symbol?: string;
   subunitName?: string;
};

/**
 * Schema for Currency definition
 *
 * Used for registering custom currencies.
 */
export const CurrencySchema = z
   .object({
      code: CurrencyCodeSchema,
      numericCode: z
         .number()
         .int()
         .min(0)
         .describe("ISO 4217 numeric code (0 for custom)"),
      name: z.string().min(1).describe("Full currency name"),
      decimalPlaces: z
         .number()
         .int()
         .min(0)
         .max(18)
         .describe("Number of decimal places"),
      symbol: z.string().optional().describe("Currency symbol"),
      subunitName: z.string().optional().describe("Name of minor unit"),
   })
   .strict()
   .describe("Currency definition");

// =============================================================================
// Amount Schemas
// =============================================================================

/**
 * Schema for validating decimal amount strings
 *
 * Accepts:
 * - Positive numbers: "123.45", "100", "0.5"
 * - Negative numbers: "-123.45", "-100"
 * - Integer strings: "100", "-50"
 */
export const AmountStringSchema = z
   .string()
   .regex(/^-?\d+(\.\d+)?$/, "Amount must be a valid decimal string")
   .describe("Decimal amount as string");

// =============================================================================
// Money Schemas
// =============================================================================

/**
 * MoneyJSON type - serializable representation of Money
 */
export type MoneyJSON = {
   amount: string;
   currency: string;
};

/**
 * Schema for Money JSON representation
 *
 * Used for API requests/responses and JSON serialization.
 *
 * @example
 * { amount: "123.45", currency: "USD" }
 */
export const MoneySchema = z
   .object({
      amount: AmountStringSchema,
      currency: CurrencyCodeSchema,
   })
   .strict()
   .describe("Money JSON representation");

/**
 * DatabaseMoney type for database storage
 */
export type DatabaseMoney = {
   amount: string;
   currency: string;
};

/**
 * Schema for database Money storage
 *
 * Identical to MoneySchema but with a distinct type for clarity.
 */
export const DatabaseMoneySchema = z
   .object({
      amount: z.string().describe("Decimal amount as string"),
      currency: CurrencyCodeSchema,
   })
   .strict()
   .describe("Database Money representation");

/**
 * MoneyInput type for flexible user input
 */
export type MoneyInput = {
   amount: string | number;
   currency: string;
};

/**
 * Schema for user input of money amounts
 *
 * More permissive than AmountStringSchema - accepts both strings and numbers.
 */
export const MoneyInputSchema = z
   .object({
      amount: z
         .union([z.string(), z.number()])
         .describe("Amount (string or number)"),
      currency: CurrencyCodeSchema,
   })
   .strict()
   .describe("Money input from user");

// =============================================================================
// Core Money Type (runtime representation with BigInt)
// =============================================================================

/**
 * Core Money type representing a monetary value with currency
 *
 * @property amount - The amount in minor units (e.g., cents) as a BigInt
 * @property currency - ISO 4217 currency code (e.g., "USD", "BRL", "JPY")
 * @property scale - Number of decimal places for this currency
 */
export type Money = {
   amount: bigint;
   currency: string;
   scale: number;
};

/**
 * Schema for the internal Money representation
 *
 * Note: This schema is for validation only. The actual Money type uses BigInt
 * which is handled separately since Zod's bigint requires different parsing.
 */
export const MoneyInternalSchema = z
   .object({
      amount: z.bigint().describe("Amount in minor units as BigInt"),
      currency: CurrencyCodeSchema,
      scale: z.number().int().min(0).max(18).describe("Decimal places"),
   })
   .strict()
   .describe("Internal Money representation");

// =============================================================================
// Format Options Schema
// =============================================================================

/**
 * FormatOptions type for formatting configuration
 */
export type FormatOptions = {
   locale?: string;
   notation?: "standard" | "compact";
   signDisplay?: "auto" | "always" | "never" | "exceptZero";
   currencyDisplay?: "symbol" | "code" | "name" | "narrowSymbol";
   hideSymbol?: boolean;
   minimumFractionDigits?: number;
   maximumFractionDigits?: number;
};

/**
 * Schema for money formatting options
 */
export const FormatOptionsSchema = z
   .object({
      /** Locale for formatting (e.g., "en-US", "pt-BR") */
      locale: z.string().optional(),
      /** Notation for formatting */
      notation: z.enum(["standard", "compact"]).optional(),
      /** How to display the sign */
      signDisplay: z.enum(["auto", "always", "never", "exceptZero"]).optional(),
      /** How to display the currency */
      currencyDisplay: z
         .enum(["symbol", "code", "name", "narrowSymbol"])
         .optional(),
      /** Hide the currency symbol/code entirely */
      hideSymbol: z.boolean().optional(),
      /** Minimum number of fraction digits to display */
      minimumFractionDigits: z.number().int().min(0).optional(),
      /** Maximum number of fraction digits to display */
      maximumFractionDigits: z.number().int().min(0).optional(),
   })
   .strict()
   .describe("Money formatting options");

// =============================================================================
// Allocation Schemas
// =============================================================================

/**
 * AllocationRatios type
 */
export type AllocationRatios = number[];

/**
 * Schema for allocation ratios
 *
 * - Non-empty array
 * - Non-negative numbers
 * - At least one non-zero value
 */
export const AllocationRatiosSchema = z
   .array(z.number().min(0, "Ratios cannot be negative"))
   .min(1, "At least one ratio is required")
   .refine((ratios) => ratios.some((r) => r > 0), {
      message: "At least one ratio must be greater than zero",
   })
   .describe("Allocation ratios");

// =============================================================================
// Backward compatibility re-exports
// =============================================================================

/**
 * @deprecated Use Currency instead
 */
export type CurrencyInput = Currency;
