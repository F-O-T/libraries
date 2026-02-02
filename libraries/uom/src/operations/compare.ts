import {
	equals as bigintEquals,
	greaterThan as bigintGreaterThan,
	greaterThanOrEqual as bigintGreaterThanOrEqual,
	lessThan as bigintLessThan,
	lessThanOrEqual as bigintLessThanOrEqual,
} from "@f-o-t/bigint";
import { UnitMismatchError } from "../errors";
import type { Measurement } from "../types/measurement";

/**
 * Check if two measurements are equal
 *
 * @param a - First measurement
 * @param b - Second measurement
 * @returns true if measurements are equal
 * @throws {UnitMismatchError} If units or scales don't match
 *
 * @example
 * ```typescript
 * const a = of("10", "kg");
 * const b = of("10", "kg");
 * equals(a, b); // true
 * ```
 */
export function equals(a: Measurement, b: Measurement): boolean {
	if (a.unit !== b.unit || a.scale !== b.scale) {
		throw new UnitMismatchError(
			`${a.unit} (scale ${a.scale})`,
			`${b.unit} (scale ${b.scale})`,
		);
	}

	return bigintEquals({ a: a.value, b: b.value, scale: a.scale });
}

/**
 * Check if first measurement is greater than second
 *
 * @param a - First measurement
 * @param b - Second measurement
 * @returns true if a > b
 * @throws {UnitMismatchError} If units or scales don't match
 *
 * @example
 * ```typescript
 * const a = of("10", "kg");
 * const b = of("5", "kg");
 * greaterThan(a, b); // true
 * ```
 */
export function greaterThan(a: Measurement, b: Measurement): boolean {
	if (a.unit !== b.unit || a.scale !== b.scale) {
		throw new UnitMismatchError(
			`${a.unit} (scale ${a.scale})`,
			`${b.unit} (scale ${b.scale})`,
		);
	}

	return bigintGreaterThan({ a: a.value, b: b.value, scale: a.scale });
}

/**
 * Check if first measurement is greater than or equal to second
 *
 * @param a - First measurement
 * @param b - Second measurement
 * @returns true if a >= b
 * @throws {UnitMismatchError} If units or scales don't match
 *
 * @example
 * ```typescript
 * const a = of("10", "kg");
 * const b = of("10", "kg");
 * greaterThanOrEqual(a, b); // true
 * ```
 */
export function greaterThanOrEqual(a: Measurement, b: Measurement): boolean {
	if (a.unit !== b.unit || a.scale !== b.scale) {
		throw new UnitMismatchError(
			`${a.unit} (scale ${a.scale})`,
			`${b.unit} (scale ${b.scale})`,
		);
	}

	return bigintGreaterThanOrEqual({ a: a.value, b: b.value, scale: a.scale });
}

/**
 * Check if first measurement is less than second
 *
 * @param a - First measurement
 * @param b - Second measurement
 * @returns true if a < b
 * @throws {UnitMismatchError} If units or scales don't match
 *
 * @example
 * ```typescript
 * const a = of("5", "kg");
 * const b = of("10", "kg");
 * lessThan(a, b); // true
 * ```
 */
export function lessThan(a: Measurement, b: Measurement): boolean {
	if (a.unit !== b.unit || a.scale !== b.scale) {
		throw new UnitMismatchError(
			`${a.unit} (scale ${a.scale})`,
			`${b.unit} (scale ${b.scale})`,
		);
	}

	return bigintLessThan({ a: a.value, b: b.value, scale: a.scale });
}

/**
 * Check if first measurement is less than or equal to second
 *
 * @param a - First measurement
 * @param b - Second measurement
 * @returns true if a <= b
 * @throws {UnitMismatchError} If units or scales don't match
 *
 * @example
 * ```typescript
 * const a = of("5", "kg");
 * const b = of("5", "kg");
 * lessThanOrEqual(a, b); // true
 * ```
 */
export function lessThanOrEqual(a: Measurement, b: Measurement): boolean {
	if (a.unit !== b.unit || a.scale !== b.scale) {
		throw new UnitMismatchError(
			`${a.unit} (scale ${a.scale})`,
			`${b.unit} (scale ${b.scale})`,
		);
	}

	return bigintLessThanOrEqual({ a: a.value, b: b.value, scale: a.scale });
}
