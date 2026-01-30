import type { z } from "zod";
import type {
   MeasurementInputSchema,
   MeasurementJSONSchema,
   MeasurementSchema,
   UnitCategorySchema,
   UnitDefinitionSchema,
} from "./schemas";

/**
 * Unit category type - defines the type of physical quantity
 */
export type UnitCategory = z.infer<typeof UnitCategorySchema>;

/**
 * Internal representation of a measurement with high precision
 */
export type Measurement = z.infer<typeof MeasurementSchema>;

/**
 * Input type for creating measurements
 */
export type MeasurementInput = z.infer<typeof MeasurementInputSchema>;

/**
 * Unit definition type - describes a unit of measurement
 */
export type UnitDefinition = z.infer<typeof UnitDefinitionSchema>;

/**
 * JSON serialization format for measurements
 */
export type MeasurementJSON = z.infer<typeof MeasurementJSONSchema>;
