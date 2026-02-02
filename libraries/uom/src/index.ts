// Export types

// Export measurement factory functions
export { DEFAULT_SCALE, of, zero } from "./core/measurement";
// Export errors
export {
   CategoryMismatchError,
   ConversionError,
   InvalidMeasurementError,
   UnitMismatchError,
   UnknownUnitError,
   UOMError,
} from "./errors";
// Export schemas
export {
   MeasurementInputSchema,
   MeasurementJSONSchema,
   MeasurementSchema,
   MeasurementRuntimeSchema,
   UnitCategorySchema,
   UnitDefinitionSchema,
} from "./schemas";
export type {
   MeasurementInput,
   MeasurementJSON,
   UnitCategory,
   UnitDefinition,
} from "./types";
export type { Category } from "./types/category";
export type { Measurement } from "./types/measurement";
export type { UnitSymbol } from "./types/units";

// Export registry functions
export {
   clearCustomUnits,
   getAllUnits,
   getUnit,
   getUnitsByCategory,
   hasUnit,
   registerUnit,
} from "./units/registry";

// Export operations
export { convert } from "./operations/convert";
export { add, subtract, multiply, divide } from "./operations/arithmetic";
export {
	equals,
	greaterThan,
	greaterThanOrEqual,
	lessThan,
	lessThanOrEqual,
} from "./operations/compare";
export { format, type FormatOptions } from "./operations/format";
