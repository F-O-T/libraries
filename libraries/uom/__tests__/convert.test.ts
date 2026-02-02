import { describe, expect, test } from "bun:test";
import { convert, of, ConversionError } from "../src/index";

describe("convert", () => {
	test("converts kg to lbs", () => {
		const kg = of(10, "kg");
		const lbs = convert(kg, "lbs");

		expect(lbs.unit).toBe("lbs");
		expect(lbs.scale).toBe(12);
		// 10 kg = 22.0462262184878 lbs
		// At scale 12: 22046226218487n (truncated)
		expect(lbs.value).toBe(22046226218487n);
	});

	test("converts meters to kilometers", () => {
		const meters = of(1000, "m");
		const km = convert(meters, "km");

		expect(km.unit).toBe("km");
		expect(km.scale).toBe(12);
		expect(km.value).toBe(1_000_000_000_000n); // 1.0 at scale 12
	});

	test("converts liters to milliliters", () => {
		const liters = of(2.5, "L");
		const ml = convert(liters, "mL");

		expect(ml.unit).toBe("mL");
		expect(ml.scale).toBe(12);
		expect(ml.value).toBe(2500_000_000_000_000n); // 2500.0 at scale 12
	});

	test("converts square meters to square centimeters", () => {
		const sqm = of(1, "m2");
		const sqcm = convert(sqm, "cm2");

		expect(sqcm.unit).toBe("cm2");
		expect(sqcm.scale).toBe(12);
		// 1 m² = 10000 cm²
		expect(sqcm.value).toBe(10000_000_000_000_000n);
	});

	test("same unit returns copy", () => {
		const original = of(10, "kg");
		const copy = convert(original, "kg");

		expect(copy).toEqual(original);
		expect(copy).not.toBe(original); // Different object
	});

	test("throws ConversionError for different categories", () => {
		const weight = of(10, "kg");

		expect(() => convert(weight, "m")).toThrow(ConversionError);
		expect(() => convert(weight, "m")).toThrow(
			"Cannot convert between different categories",
		);
	});

	test("throws for unknown target unit", () => {
		const weight = of(10, "kg");

		expect(() => convert(weight, "unknown" as any)).toThrow(ConversionError);
		expect(() => convert(weight, "unknown" as any)).toThrow(
			"Unknown target unit",
		);
	});
});
