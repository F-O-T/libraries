import { divide, multiply } from "@f-o-t/bigint";
import { ConversionError, UnknownUnitError } from "../errors";
import type { Measurement } from "../types/measurement";
import type { UnitSymbol } from "../types/units";
import { getUnit } from "../units/registry";
import { fromBaseUnits } from "../core/measurement";
import { parseDecimalToBigInt } from "../utils/precision";

/**
 * Convert a measurement to a different unit within the same category
 *
 * @param measurement - The measurement to convert
 * @param targetUnit - The target unit symbol
 * @returns A new measurement in the target unit
 * @throws {ConversionError} If units are in different categories
 * @throws {UnknownUnitError} If target unit is unknown
 *
 * @example
 * ```typescript
 * const kg = of(10, "kg");
 * const lbs = convert(kg, "lbs"); // 22.046226218 lbs
 * ```
 */
export function convert(
	measurement: Measurement,
	targetUnit: UnitSymbol,
): Measurement {
	let sourceUnitDef;
	let targetUnitDef;

	// Get source unit definition
	try {
		sourceUnitDef = getUnit(measurement.unit);
	} catch (error) {
		if (error instanceof UnknownUnitError) {
			throw new ConversionError(
				measurement.unit,
				targetUnit,
				`Unknown source unit: ${measurement.unit}`,
			);
		}
		throw error;
	}

	// Get target unit definition
	try {
		targetUnitDef = getUnit(targetUnit);
	} catch (error) {
		if (error instanceof UnknownUnitError) {
			throw new ConversionError(
				measurement.unit,
				targetUnit,
				`Unknown target unit: ${targetUnit}`,
			);
		}
		throw error;
	}

	// Check if units are in the same category
	if (sourceUnitDef.category !== targetUnitDef.category) {
		throw new ConversionError(
			measurement.unit,
			targetUnit,
			`Cannot convert between different categories: ${sourceUnitDef.category} to ${targetUnitDef.category}`,
		);
	}

	// Same unit, just return a copy
	if (measurement.unit === targetUnit) {
		return { ...measurement };
	}

	// Parse conversion factors to BigInt
	const sourceConversionFactor = parseDecimalToBigInt(
		sourceUnitDef.conversionFactor,
		measurement.scale,
	);
	const targetConversionFactor = parseDecimalToBigInt(
		targetUnitDef.conversionFactor,
		measurement.scale,
	);

	// Convert to base units: value * sourceConversionFactor
	const inBaseUnits = multiply({
		a: measurement.value,
		b: sourceConversionFactor,
		scale: measurement.scale,
	});

	// Convert from base units to target: inBaseUnits / targetConversionFactor
	const inTargetUnits = divide({
		a: inBaseUnits,
		b: targetConversionFactor,
		scale: measurement.scale,
	});

	return fromBaseUnits(inTargetUnits, targetUnit, measurement.scale);
}
