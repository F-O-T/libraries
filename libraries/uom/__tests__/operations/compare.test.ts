import { describe, expect, test } from "bun:test";
import { of } from "../../src/core/measurement";
import {
	equals,
	greaterThan,
	greaterThanOrEqual,
	lessThan,
	lessThanOrEqual,
} from "../../src/operations/compare";
import { UnitMismatchError } from "../../src/errors";

describe("equals", () => {
	test("returns true for equal measurements", () => {
		const a = of(10, "kg");
		const b = of(10, "kg");

		expect(equals(a, b)).toBe(true);
	});

	test("returns false for unequal measurements", () => {
		const a = of(10, "kg");
		const b = of(5, "kg");

		expect(equals(a, b)).toBe(false);
	});

	test("returns true for equal decimal measurements", () => {
		const a = of("10.5", "m");
		const b = of("10.5", "m");

		expect(equals(a, b)).toBe(true);
	});

	test("returns false for different decimal measurements", () => {
		const a = of("10.5", "m");
		const b = of("10.6", "m");

		expect(equals(a, b)).toBe(false);
	});

	test("returns true for zero measurements", () => {
		const a = of(0, "kg");
		const b = of(0, "kg");

		expect(equals(a, b)).toBe(true);
	});

	test("returns true for equal negative measurements", () => {
		const a = of(-10, "kg");
		const b = of(-10, "kg");

		expect(equals(a, b)).toBe(true);
	});

	test("returns false for positive vs negative", () => {
		const a = of(10, "kg");
		const b = of(-10, "kg");

		expect(equals(a, b)).toBe(false);
	});

	test("throws UnitMismatchError for different units", () => {
		const kg = of(10, "kg");
		const m = of(10, "m");

		expect(() => equals(kg, m)).toThrow(UnitMismatchError);
	});

	test("throws UnitMismatchError for different scales", () => {
		const a = of(10, "kg", 12);
		const b = of(10, "kg", 6);

		expect(() => equals(a, b)).toThrow(UnitMismatchError);
	});
});

describe("greaterThan", () => {
	test("returns true when first is greater", () => {
		const a = of(10, "kg");
		const b = of(5, "kg");

		expect(greaterThan(a, b)).toBe(true);
	});

	test("returns false when first is less", () => {
		const a = of(5, "kg");
		const b = of(10, "kg");

		expect(greaterThan(a, b)).toBe(false);
	});

	test("returns false when equal", () => {
		const a = of(10, "kg");
		const b = of(10, "kg");

		expect(greaterThan(a, b)).toBe(false);
	});

	test("returns true for positive vs negative", () => {
		const a = of(5, "kg");
		const b = of(-5, "kg");

		expect(greaterThan(a, b)).toBe(true);
	});

	test("returns true for zero vs negative", () => {
		const a = of(0, "kg");
		const b = of(-1, "kg");

		expect(greaterThan(a, b)).toBe(true);
	});

	test("returns false for negative vs zero", () => {
		const a = of(-1, "kg");
		const b = of(0, "kg");

		expect(greaterThan(a, b)).toBe(false);
	});

	test("handles decimal comparisons", () => {
		const a = of("10.51", "m");
		const b = of("10.5", "m");

		expect(greaterThan(a, b)).toBe(true);
	});

	test("throws UnitMismatchError for different units", () => {
		const kg = of(10, "kg");
		const m = of(10, "m");

		expect(() => greaterThan(kg, m)).toThrow(UnitMismatchError);
	});

	test("throws UnitMismatchError for different scales", () => {
		const a = of(10, "kg", 12);
		const b = of(10, "kg", 6);

		expect(() => greaterThan(a, b)).toThrow(UnitMismatchError);
	});
});

describe("greaterThanOrEqual", () => {
	test("returns true when first is greater", () => {
		const a = of(10, "kg");
		const b = of(5, "kg");

		expect(greaterThanOrEqual(a, b)).toBe(true);
	});

	test("returns true when equal", () => {
		const a = of(10, "kg");
		const b = of(10, "kg");

		expect(greaterThanOrEqual(a, b)).toBe(true);
	});

	test("returns false when first is less", () => {
		const a = of(5, "kg");
		const b = of(10, "kg");

		expect(greaterThanOrEqual(a, b)).toBe(false);
	});

	test("returns true for equal decimals", () => {
		const a = of("10.5", "m");
		const b = of("10.5", "m");

		expect(greaterThanOrEqual(a, b)).toBe(true);
	});

	test("returns true for equal zeros", () => {
		const a = of(0, "kg");
		const b = of(0, "kg");

		expect(greaterThanOrEqual(a, b)).toBe(true);
	});

	test("returns true for equal negatives", () => {
		const a = of(-10, "kg");
		const b = of(-10, "kg");

		expect(greaterThanOrEqual(a, b)).toBe(true);
	});

	test("throws UnitMismatchError for different units", () => {
		const kg = of(10, "kg");
		const m = of(10, "m");

		expect(() => greaterThanOrEqual(kg, m)).toThrow(UnitMismatchError);
	});

	test("throws UnitMismatchError for different scales", () => {
		const a = of(10, "kg", 12);
		const b = of(10, "kg", 6);

		expect(() => greaterThanOrEqual(a, b)).toThrow(UnitMismatchError);
	});
});

describe("lessThan", () => {
	test("returns true when first is less", () => {
		const a = of(5, "kg");
		const b = of(10, "kg");

		expect(lessThan(a, b)).toBe(true);
	});

	test("returns false when first is greater", () => {
		const a = of(10, "kg");
		const b = of(5, "kg");

		expect(lessThan(a, b)).toBe(false);
	});

	test("returns false when equal", () => {
		const a = of(10, "kg");
		const b = of(10, "kg");

		expect(lessThan(a, b)).toBe(false);
	});

	test("returns true for negative vs positive", () => {
		const a = of(-5, "kg");
		const b = of(5, "kg");

		expect(lessThan(a, b)).toBe(true);
	});

	test("returns true for negative comparisons", () => {
		const a = of(-10, "kg");
		const b = of(-5, "kg");

		expect(lessThan(a, b)).toBe(true);
	});

	test("returns true for negative vs zero", () => {
		const a = of(-1, "kg");
		const b = of(0, "kg");

		expect(lessThan(a, b)).toBe(true);
	});

	test("returns true for zero vs positive", () => {
		const a = of(0, "kg");
		const b = of(1, "kg");

		expect(lessThan(a, b)).toBe(true);
	});

	test("handles decimal comparisons", () => {
		const a = of("10.5", "m");
		const b = of("10.51", "m");

		expect(lessThan(a, b)).toBe(true);
	});

	test("throws UnitMismatchError for different units", () => {
		const kg = of(10, "kg");
		const m = of(10, "m");

		expect(() => lessThan(kg, m)).toThrow(UnitMismatchError);
	});

	test("throws UnitMismatchError for different scales", () => {
		const a = of(10, "kg", 12);
		const b = of(10, "kg", 6);

		expect(() => lessThan(a, b)).toThrow(UnitMismatchError);
	});
});

describe("lessThanOrEqual", () => {
	test("returns true when first is less", () => {
		const a = of(5, "kg");
		const b = of(10, "kg");

		expect(lessThanOrEqual(a, b)).toBe(true);
	});

	test("returns true when equal", () => {
		const a = of(10, "kg");
		const b = of(10, "kg");

		expect(lessThanOrEqual(a, b)).toBe(true);
	});

	test("returns false when first is greater", () => {
		const a = of(10, "kg");
		const b = of(5, "kg");

		expect(lessThanOrEqual(a, b)).toBe(false);
	});

	test("returns true for equal decimals", () => {
		const a = of("10.5", "m");
		const b = of("10.5", "m");

		expect(lessThanOrEqual(a, b)).toBe(true);
	});

	test("returns true for equal zeros", () => {
		const a = of(0, "kg");
		const b = of(0, "kg");

		expect(lessThanOrEqual(a, b)).toBe(true);
	});

	test("returns true for equal negatives", () => {
		const a = of(-10, "kg");
		const b = of(-10, "kg");

		expect(lessThanOrEqual(a, b)).toBe(true);
	});

	test("throws UnitMismatchError for different units", () => {
		const kg = of(10, "kg");
		const m = of(10, "m");

		expect(() => lessThanOrEqual(kg, m)).toThrow(UnitMismatchError);
	});

	test("throws UnitMismatchError for different scales", () => {
		const a = of(10, "kg", 12);
		const b = of(10, "kg", 6);

		expect(() => lessThanOrEqual(a, b)).toThrow(UnitMismatchError);
	});
});

describe("comparison edge cases", () => {
	test("handles very large values", () => {
		const a = of("999999999999.999999999999", "kg");
		const b = of("999999999999.999999999998", "kg");

		expect(greaterThan(a, b)).toBe(true);
		expect(lessThan(b, a)).toBe(true);
		expect(equals(a, a)).toBe(true);
	});

	test("handles very small values", () => {
		const a = of("0.000000000001", "m");
		const b = of("0.000000000002", "m");

		expect(lessThan(a, b)).toBe(true);
		expect(greaterThan(b, a)).toBe(true);
	});

	test("handles very small differences", () => {
		const a = of("10.000000000001", "kg");
		const b = of("10.000000000002", "kg");

		expect(lessThan(a, b)).toBe(true);
		expect(greaterThan(b, a)).toBe(true);
		expect(equals(a, b)).toBe(false);
	});

	test("all comparison functions throw for different units", () => {
		const kg = of(10, "kg");
		const m = of(10, "m");

		expect(() => equals(kg, m)).toThrow(UnitMismatchError);
		expect(() => greaterThan(kg, m)).toThrow(UnitMismatchError);
		expect(() => greaterThanOrEqual(kg, m)).toThrow(UnitMismatchError);
		expect(() => lessThan(kg, m)).toThrow(UnitMismatchError);
		expect(() => lessThanOrEqual(kg, m)).toThrow(UnitMismatchError);
	});
});
