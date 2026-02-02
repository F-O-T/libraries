import { createOperator } from "@f-o-t/condition-evaluator";
import {
	equals,
	greaterThan,
	greaterThanOrEqual,
	lessThan,
	lessThanOrEqual,
} from "../../operations/compare";
import { MeasurementRuntimeSchema } from "../../schemas";
import type { Measurement } from "../../types/measurement";

/**
 * Helper to validate and extract measurement
 */
function toMeasurement(value: unknown): Measurement {
	return MeasurementRuntimeSchema.parse(value);
}

/**
 * Measurement equals operator
 */
export const measurementEqualsOperator = createOperator({
	name: "measurement_eq",
	type: "custom",
	description: "Check if two measurements are equal",
	evaluate: (actual: unknown, expected: unknown): boolean => {
		const a = toMeasurement(actual);
		const b = toMeasurement(expected);
		return equals(a, b);
	},
	valueSchema: MeasurementRuntimeSchema,
});

/**
 * Measurement not equals operator
 */
export const measurementNotEqualsOperator = createOperator({
	name: "measurement_neq",
	type: "custom",
	description: "Check if two measurements are not equal",
	evaluate: (actual: unknown, expected: unknown): boolean => {
		const a = toMeasurement(actual);
		const b = toMeasurement(expected);
		return !equals(a, b);
	},
	valueSchema: MeasurementRuntimeSchema,
});

/**
 * Measurement greater than operator
 */
export const measurementGreaterThanOperator = createOperator({
	name: "measurement_gt",
	type: "custom",
	description: "Check if measurement is greater than expected",
	evaluate: (actual: unknown, expected: unknown): boolean => {
		const a = toMeasurement(actual);
		const b = toMeasurement(expected);
		return greaterThan(a, b);
	},
	valueSchema: MeasurementRuntimeSchema,
});

/**
 * Measurement greater than or equal operator
 */
export const measurementGreaterThanOrEqualOperator = createOperator({
	name: "measurement_gte",
	type: "custom",
	description: "Check if measurement is greater than or equal to expected",
	evaluate: (actual: unknown, expected: unknown): boolean => {
		const a = toMeasurement(actual);
		const b = toMeasurement(expected);
		return greaterThanOrEqual(a, b);
	},
	valueSchema: MeasurementRuntimeSchema,
});

/**
 * Measurement less than operator
 */
export const measurementLessThanOperator = createOperator({
	name: "measurement_lt",
	type: "custom",
	description: "Check if measurement is less than expected",
	evaluate: (actual: unknown, expected: unknown): boolean => {
		const a = toMeasurement(actual);
		const b = toMeasurement(expected);
		return lessThan(a, b);
	},
	valueSchema: MeasurementRuntimeSchema,
});

/**
 * Measurement less than or equal operator
 */
export const measurementLessThanOrEqualOperator = createOperator({
	name: "measurement_lte",
	type: "custom",
	description: "Check if measurement is less than or equal to expected",
	evaluate: (actual: unknown, expected: unknown): boolean => {
		const a = toMeasurement(actual);
		const b = toMeasurement(expected);
		return lessThanOrEqual(a, b);
	},
	valueSchema: MeasurementRuntimeSchema,
});
