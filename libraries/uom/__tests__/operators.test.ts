import { describe, expect, test } from "bun:test";
import { of } from "../src/core/measurement";
import {
	measurementEqualsOperator,
	measurementNotEqualsOperator,
	measurementGreaterThanOperator,
	measurementGreaterThanOrEqualOperator,
	measurementLessThanOperator,
	measurementLessThanOrEqualOperator,
} from "../src/plugins/operators";

describe("Measurement Operators", () => {
	describe("measurementEqualsOperator", () => {
		test("should return true for equal measurements", () => {
			const a = of("100", "kg");
			const b = of("100", "kg");
			expect(measurementEqualsOperator.evaluate(a, b)).toBe(true);
		});

		test("should return false for unequal measurements", () => {
			const a = of("100", "kg");
			const b = of("200", "kg");
			expect(measurementEqualsOperator.evaluate(a, b)).toBe(false);
		});

		test("should throw on unit mismatch", () => {
			const a = of("100", "kg");
			const b = of("100", "g");
			expect(() => measurementEqualsOperator.evaluate(a, b)).toThrow();
		});

		test("should throw on invalid input", () => {
			expect(() => measurementEqualsOperator.evaluate("invalid", "invalid")).toThrow();
		});

		test("should have correct metadata", () => {
			expect(measurementEqualsOperator.name).toBe("measurement_eq");
			expect(measurementEqualsOperator.type).toBe("custom");
			expect(measurementEqualsOperator.description).toBeTruthy();
		});
	});

	describe("measurementNotEqualsOperator", () => {
		test("should return true for unequal measurements", () => {
			const a = of("100", "kg");
			const b = of("200", "kg");
			expect(measurementNotEqualsOperator.evaluate(a, b)).toBe(true);
		});

		test("should return false for equal measurements", () => {
			const a = of("100", "kg");
			const b = of("100", "kg");
			expect(measurementNotEqualsOperator.evaluate(a, b)).toBe(false);
		});

		test("should throw on unit mismatch", () => {
			const a = of("100", "kg");
			const b = of("100", "g");
			expect(() => measurementNotEqualsOperator.evaluate(a, b)).toThrow();
		});

		test("should have correct metadata", () => {
			expect(measurementNotEqualsOperator.name).toBe("measurement_neq");
			expect(measurementNotEqualsOperator.type).toBe("custom");
		});
	});

	describe("measurementGreaterThanOperator", () => {
		test("should return true when actual > expected", () => {
			const a = of("200", "kg");
			const b = of("100", "kg");
			expect(measurementGreaterThanOperator.evaluate(a, b)).toBe(true);
		});

		test("should return false when actual <= expected", () => {
			const a = of("100", "kg");
			const b = of("100", "kg");
			expect(measurementGreaterThanOperator.evaluate(a, b)).toBe(false);

			const c = of("50", "kg");
			const d = of("100", "kg");
			expect(measurementGreaterThanOperator.evaluate(c, d)).toBe(false);
		});

		test("should throw on unit mismatch", () => {
			const a = of("100", "kg");
			const b = of("100", "g");
			expect(() => measurementGreaterThanOperator.evaluate(a, b)).toThrow();
		});

		test("should have correct metadata", () => {
			expect(measurementGreaterThanOperator.name).toBe("measurement_gt");
			expect(measurementGreaterThanOperator.type).toBe("custom");
		});
	});

	describe("measurementGreaterThanOrEqualOperator", () => {
		test("should return true when actual >= expected", () => {
			const a = of("200", "kg");
			const b = of("100", "kg");
			expect(measurementGreaterThanOrEqualOperator.evaluate(a, b)).toBe(true);

			const c = of("100", "kg");
			const d = of("100", "kg");
			expect(measurementGreaterThanOrEqualOperator.evaluate(c, d)).toBe(true);
		});

		test("should return false when actual < expected", () => {
			const a = of("50", "kg");
			const b = of("100", "kg");
			expect(measurementGreaterThanOrEqualOperator.evaluate(a, b)).toBe(false);
		});

		test("should throw on unit mismatch", () => {
			const a = of("100", "kg");
			const b = of("100", "g");
			expect(() => measurementGreaterThanOrEqualOperator.evaluate(a, b)).toThrow();
		});

		test("should have correct metadata", () => {
			expect(measurementGreaterThanOrEqualOperator.name).toBe("measurement_gte");
			expect(measurementGreaterThanOrEqualOperator.type).toBe("custom");
		});
	});

	describe("measurementLessThanOperator", () => {
		test("should return true when actual < expected", () => {
			const a = of("50", "kg");
			const b = of("100", "kg");
			expect(measurementLessThanOperator.evaluate(a, b)).toBe(true);
		});

		test("should return false when actual >= expected", () => {
			const a = of("100", "kg");
			const b = of("100", "kg");
			expect(measurementLessThanOperator.evaluate(a, b)).toBe(false);

			const c = of("200", "kg");
			const d = of("100", "kg");
			expect(measurementLessThanOperator.evaluate(c, d)).toBe(false);
		});

		test("should throw on unit mismatch", () => {
			const a = of("100", "kg");
			const b = of("100", "g");
			expect(() => measurementLessThanOperator.evaluate(a, b)).toThrow();
		});

		test("should have correct metadata", () => {
			expect(measurementLessThanOperator.name).toBe("measurement_lt");
			expect(measurementLessThanOperator.type).toBe("custom");
		});
	});

	describe("measurementLessThanOrEqualOperator", () => {
		test("should return true when actual <= expected", () => {
			const a = of("50", "kg");
			const b = of("100", "kg");
			expect(measurementLessThanOrEqualOperator.evaluate(a, b)).toBe(true);

			const c = of("100", "kg");
			const d = of("100", "kg");
			expect(measurementLessThanOrEqualOperator.evaluate(c, d)).toBe(true);
		});

		test("should return false when actual > expected", () => {
			const a = of("200", "kg");
			const b = of("100", "kg");
			expect(measurementLessThanOrEqualOperator.evaluate(a, b)).toBe(false);
		});

		test("should throw on unit mismatch", () => {
			const a = of("100", "kg");
			const b = of("100", "g");
			expect(() => measurementLessThanOrEqualOperator.evaluate(a, b)).toThrow();
		});

		test("should have correct metadata", () => {
			expect(measurementLessThanOrEqualOperator.name).toBe("measurement_lte");
			expect(measurementLessThanOrEqualOperator.type).toBe("custom");
		});
	});

	describe("Integration tests", () => {
		test("should work with different units in same category", () => {
			const kg = of("1000", "g"); // 1 kg in grams
			const g = of("1000", "g");
			expect(measurementEqualsOperator.evaluate(kg, g)).toBe(true);
		});

		test("should work with decimal values", () => {
			const a = of("10.5", "kg");
			const b = of("10.6", "kg");
			expect(measurementLessThanOperator.evaluate(a, b)).toBe(true);
		});

		test("should work with volume measurements", () => {
			const a = of("1", "L");
			const b = of("2", "L");
			expect(measurementLessThanOperator.evaluate(a, b)).toBe(true);
		});

		test("should work with length measurements", () => {
			const a = of("1", "m");
			const b = of("2", "m");
			expect(measurementLessThanOperator.evaluate(a, b)).toBe(true);
		});
	});
});
