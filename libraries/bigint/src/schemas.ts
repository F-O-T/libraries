import { z } from "zod";

/**
 * Rounding mode for handling excess decimal places
 */
export const RoundingModeSchema = z.enum(["truncate", "round", "ceil", "floor"]);

/**
 * Scale (decimal places) - must be non-negative integer
 */
export const ScaleSchema = z.number().int().nonnegative();

/**
 * Decimal string format validation
 */
export const DecimalStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, "Invalid number format");

/**
 * BigInt value schema
 */
export const BigIntValueSchema = z.bigint();

/**
 * Parse function input schema
 */
export const ParseInputSchema = z.object({
  value: z.union([z.number().finite(), DecimalStringSchema]),
  scale: ScaleSchema,
  roundingMode: RoundingModeSchema.optional(),
});

/**
 * Arithmetic operation input schema
 */
export const ArithmeticInputSchema = z.object({
  a: z.bigint(),
  b: z.bigint(),
  scale: ScaleSchema,
});

/**
 * Division input schema with zero-check
 */
export const DivideInputSchema = ArithmeticInputSchema.extend({
  roundingMode: RoundingModeSchema.optional(),
}).refine((data) => data.b !== 0n, "Division by zero is not allowed");

/**
 * Scale conversion input schema
 */
export const ConvertScaleInputSchema = z.object({
  value: z.bigint(),
  fromScale: ScaleSchema,
  toScale: ScaleSchema,
  roundingMode: RoundingModeSchema.optional(),
});

/**
 * Format function input schema
 */
export const FormatInputSchema = z.object({
  value: z.bigint(),
  scale: ScaleSchema,
  trimTrailingZeros: z.boolean().default(true),
});

/**
 * Scaled bigint value (for condition-evaluator integration)
 */
export const ScaledBigIntSchema = z.object({
  value: z.bigint(),
  scale: ScaleSchema,
});

// Type exports
export type RoundingMode = z.infer<typeof RoundingModeSchema>;
export type ParseInput = z.infer<typeof ParseInputSchema>;
export type ArithmeticInput = z.infer<typeof ArithmeticInputSchema>;
export type DivideInput = z.infer<typeof DivideInputSchema>;
export type ConvertScaleInput = z.infer<typeof ConvertScaleInputSchema>;
export type FormatInput = z.infer<typeof FormatInputSchema>;
export type ScaledBigInt = z.infer<typeof ScaledBigIntSchema>;
