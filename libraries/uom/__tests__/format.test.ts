import { describe, expect, test } from "bun:test";
import { format, of } from "../src/index";

describe("format", () => {
	test("formats measurement with default options", () => {
		const measurement = of(10.5, "kg");
		expect(format(measurement)).toBe("10.5 kg");
	});

	test("formats with trimmed trailing zeros", () => {
		const measurement = of(10, "kg");
		expect(format(measurement)).toBe("10 kg");
	});

	test("formats without unit when includeUnit is false", () => {
		const measurement = of(10.5, "kg");
		expect(format(measurement, { includeUnit: false })).toBe("10.5");
	});

	test("formats with custom unit label", () => {
		const measurement = of(10.5, "kg");
		expect(format(measurement, { unitLabel: "kilograms" })).toBe("10.5 kilograms");
	});

	test("formats negative values", () => {
		const measurement = of(-5.25, "m");
		expect(format(measurement)).toBe("-5.25 m");
	});

	test("formats zero", () => {
		const measurement = of(0, "L");
		expect(format(measurement)).toBe("0 L");
	});

	test("formats very precise values", () => {
		const measurement = of("123.456789012345", "m");
		expect(format(measurement)).toBe("123.456789012345 m");
	});

	test("formats volume units", () => {
		expect(format(of(2.5, "L"))).toBe("2.5 L");
		expect(format(of(500, "mL"))).toBe("500 mL");
	});

	test("formats temperature units", () => {
		expect(format(of(100, "C"))).toBe("100 °C");
		expect(format(of(32, "F"))).toBe("32 °F");
	});
});
