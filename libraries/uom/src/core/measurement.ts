import { InvalidMeasurementError } from "../errors";
import type { Category } from "../types/category";
import type { Measurement } from "../types/measurement";
import type { UnitSymbol } from "../types/units";
import { getUnit } from "../units/registry";
import { PRECISION_SCALE, parseDecimalToBigInt } from "../utils/precision";

/**
 * Default scale for measurements (12 decimal places)
 */
export const DEFAULT_SCALE = PRECISION_SCALE;

/**
 * Internal helper to create a Measurement object
 * @internal
 */
export function createMeasurement(
   value: bigint,
   unit: UnitSymbol,
   scale: number,
   category: Category,
): Measurement {
   return {
      value,
      unit,
      scale,
      category,
   };
}

/**
 * Create a measurement from a number or string value
 *
 * @param value - The numeric value as number or string
 * @param unit - The unit symbol
 * @param scale - Decimal precision (default: 12)
 * @returns A new Measurement object
 *
 * @example
 * ```typescript
 * const length = of(10.5, "meter");
 * const mass = of("25.75", "kilogram");
 * const volume = of(100, "liter", 6); // Custom scale
 * ```
 */
export function of(
   value: number | string,
   unit: UnitSymbol,
   scale: number = DEFAULT_SCALE,
): Measurement {
   const unitDef = getUnit(unit);
   if (!unitDef) {
      throw new InvalidMeasurementError(`Unknown unit: ${unit}`);
   }

   const bigIntValue = parseDecimalToBigInt(value, scale);

   return createMeasurement(bigIntValue, unit, scale, unitDef.category);
}

/**
 * Create a zero-valued measurement
 *
 * @param unit - The unit symbol
 * @param scale - Decimal precision (default: 12)
 * @returns A new Measurement object with value 0
 *
 * @example
 * ```typescript
 * const noLength = zero("meter");
 * const noMass = zero("kilogram", 6);
 * ```
 */
export function zero(
   unit: UnitSymbol,
   scale: number = DEFAULT_SCALE,
): Measurement {
   const unitDef = getUnit(unit);
   if (!unitDef) {
      throw new InvalidMeasurementError(`Unknown unit: ${unit}`);
   }

   return createMeasurement(0n, unit, scale, unitDef.category);
}

/**
 * Create a measurement from base units (for internal conversions)
 *
 * @param value - The value in base units as BigInt
 * @param unit - The unit symbol
 * @param scale - Decimal precision
 * @returns A new Measurement object
 *
 * @internal
 */
export function fromBaseUnits(
   value: bigint,
   unit: UnitSymbol,
   scale: number,
): Measurement {
   const unitDef = getUnit(unit);
   if (!unitDef) {
      throw new InvalidMeasurementError(`Unknown unit: ${unit}`);
   }

   return createMeasurement(value, unit, scale, unitDef.category);
}
