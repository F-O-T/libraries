import { z } from "zod";

/**
 * Unit category enum - defines the type of physical quantity
 */
export const UnitCategorySchema = z.enum([
   "weight",
   "volume",
   "length",
   "area",
   "temperature",
]);

/**
 * Internal representation of a measurement with high precision
 * Value is stored as string for BigInt serialization
 */
export const MeasurementSchema = z.object({
   value: z.string(),
   unit: z.string(),
   scale: z.number().int().min(0).max(20),
   category: UnitCategorySchema,
});

/**
 * Runtime measurement schema for condition-evaluator operators
 * Uses bigint for actual runtime values
 */
export const MeasurementRuntimeSchema = z.object({
   value: z.bigint(),
   unit: z.string(),
   scale: z.number().int().min(0).max(20),
   category: UnitCategorySchema,
});

/**
 * Input schema for creating measurements
 * Accepts string or number values for convenience
 */
export const MeasurementInputSchema = z.object({
   value: z.union([z.string(), z.number()]),
   unit: z.string(),
});

/**
 * Unit definition schema - describes a unit of measurement
 * Includes conversion information relative to base unit
 */
export const UnitDefinitionSchema = z.object({
   code: z.string(),
   name: z.string(),
   category: UnitCategorySchema,
   baseUnit: z.string(),
   conversionFactor: z.string(),
   symbol: z.string().optional(),
   aliases: z.array(z.string()).optional(),
});

/**
 * JSON serialization format for measurements
 * Simplified representation for external use
 */
export const MeasurementJSONSchema = z.object({
   value: z.string(),
   unit: z.string(),
   category: UnitCategorySchema.optional(),
});
