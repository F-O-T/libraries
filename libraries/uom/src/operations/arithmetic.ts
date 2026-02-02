import {
   add as bigintAdd,
   subtract as bigintSubtract,
   multiply as bigintMultiply,
   divide as bigintDivide,
} from "@f-o-t/bigint";
import { InvalidMeasurementError, UnitMismatchError } from "../errors";
import type { Measurement } from "../types/measurement";
import { fromBaseUnits } from "../core/measurement";
import { parseDecimalToBigInt } from "../utils/precision";

/**
 * Add two measurements with the same unit and scale
 *
 * @param a - First measurement
 * @param b - Second measurement
 * @returns A new measurement representing a + b
 * @throws {UnitMismatchError} If measurements have different units or scales
 *
 * @example
 * ```typescript
 * const a = of("10.5", "m");
 * const b = of("5.25", "m");
 * const sum = add(a, b); // 15.75 m
 * ```
 */
export function add(a: Measurement, b: Measurement): Measurement {
   if (a.unit !== b.unit || a.scale !== b.scale) {
      throw new UnitMismatchError(
         `${a.unit} (scale ${a.scale})`,
         `${b.unit} (scale ${b.scale})`,
      );
   }

   const result = bigintAdd({ a: a.value, b: b.value, scale: a.scale });

   return fromBaseUnits(result, a.unit, a.scale);
}

/**
 * Subtract one measurement from another with the same unit and scale
 *
 * @param a - Minuend (measurement to subtract from)
 * @param b - Subtrahend (measurement to subtract)
 * @returns A new measurement representing a - b
 * @throws {UnitMismatchError} If measurements have different units or scales
 *
 * @example
 * ```typescript
 * const a = of("10.5", "m");
 * const b = of("5.25", "m");
 * const diff = subtract(a, b); // 5.25 m
 * ```
 */
export function subtract(a: Measurement, b: Measurement): Measurement {
   if (a.unit !== b.unit || a.scale !== b.scale) {
      throw new UnitMismatchError(
         `${a.unit} (scale ${a.scale})`,
         `${b.unit} (scale ${b.scale})`,
      );
   }

   const result = bigintSubtract({ a: a.value, b: b.value, scale: a.scale });

   return fromBaseUnits(result, a.unit, a.scale);
}

/**
 * Multiply a measurement by a scalar value
 *
 * @param measurement - The measurement to multiply
 * @param scalar - The scalar multiplier (number or string)
 * @returns A new measurement representing measurement * scalar
 *
 * @example
 * ```typescript
 * const length = of("10.5", "m");
 * const doubled = multiply(length, 2); // 21 m
 * const scaled = multiply(length, "1.5"); // 15.75 m
 * ```
 */
export function multiply(
   measurement: Measurement,
   scalar: number | string,
): Measurement {
   const scalarBigInt = parseDecimalToBigInt(scalar, measurement.scale);

   const result = bigintMultiply({
      a: measurement.value,
      b: scalarBigInt,
      scale: measurement.scale,
   });

   return fromBaseUnits(result, measurement.unit, measurement.scale);
}

/**
 * Divide a measurement by a scalar value
 *
 * @param measurement - The measurement to divide
 * @param scalar - The scalar divisor (number or string, must not be zero)
 * @returns A new measurement representing measurement / scalar
 * @throws {InvalidMeasurementError} If scalar is zero
 *
 * @example
 * ```typescript
 * const length = of("10", "m");
 * const halved = divide(length, 2); // 5 m
 * const divided = divide(length, "2.5"); // 4 m
 * ```
 */
export function divide(
   measurement: Measurement,
   scalar: number | string,
): Measurement {
   const scalarBigInt = parseDecimalToBigInt(scalar, measurement.scale);

   if (scalarBigInt === 0n) {
      throw new InvalidMeasurementError("Cannot divide by zero");
   }

   const result = bigintDivide({
      a: measurement.value,
      b: scalarBigInt,
      scale: measurement.scale,
      roundingMode: "truncate",
   });

   return fromBaseUnits(result, measurement.unit, measurement.scale);
}
