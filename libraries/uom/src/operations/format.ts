import { formatBigIntToDecimal } from "../utils/precision";
import type { Measurement } from "../types/measurement";
import { getUnit } from "../units/registry";

export interface FormatOptions {
	/**
	 * Whether to include the unit symbol in output
	 * @default true
	 */
	includeUnit?: boolean;

	/**
	 * Custom unit label (overrides the unit symbol)
	 */
	unitLabel?: string;
}

/**
 * Format a measurement as a human-readable string
 *
 * @param measurement - The measurement to format
 * @param options - Formatting options
 * @returns Formatted string representation
 *
 * @example
 * ```typescript
 * format(of(10.5, "kg")); // "10.5 kg"
 * format(of(10.5, "kg"), { includeUnit: false }); // "10.5"
 * format(of(10.5, "kg"), { unitLabel: "kilograms" }); // "10.5 kilograms"
 * ```
 */
export function format(
	measurement: Measurement,
	options: FormatOptions = {},
): string {
	const { includeUnit = true, unitLabel } = options;

	const numericValue = formatBigIntToDecimal(
		measurement.value,
		measurement.scale,
	);

	if (!includeUnit) {
		return numericValue;
	}

	// Get the unit symbol from the registry if no custom label provided
	const unit = unitLabel ?? getUnit(measurement.unit).symbol;
	return `${numericValue} ${unit}`;
}
