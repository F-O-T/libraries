import { describe, expect, it } from "bun:test";
import { of, zero } from "../../src/core/measurement";
import { add, subtract, multiply, divide } from "../../src/operations/arithmetic";
import { UnitMismatchError, InvalidMeasurementError } from "../../src/errors";

describe("arithmetic operations", () => {
   describe("add()", () => {
      it("should add two measurements with same unit", () => {
         const a = of("10.5", "m");
         const b = of("5.25", "m");
         const result = add(a, b);

         expect(result.value).toBe(15750000000000n);
         expect(result.unit).toBe("m");
         expect(result.scale).toBe(12);
      });

      it("should add measurements with negative values", () => {
         const a = of("10.5", "kg");
         const b = of("-5.25", "kg");
         const result = add(a, b);

         expect(result.value).toBe(5250000000000n);
         expect(result.unit).toBe("kg");
      });

      it("should add zero to measurement", () => {
         const a = of("10.5", "L");
         const b = of("0", "L");
         const result = add(a, b);

         expect(result.value).toBe(10500000000000n);
         expect(result.unit).toBe("L");
      });

      it("should throw UnitMismatchError for different units", () => {
         const a = of("10", "m");
         const b = of("5", "kg");

         expect(() => add(a, b)).toThrow(UnitMismatchError);
      });

      it("should throw UnitMismatchError for different scales", () => {
         const a = of("10", "m", 12);
         const b = of("5", "m", 6);

         expect(() => add(a, b)).toThrow(UnitMismatchError);
      });

      it("should add large values", () => {
         const a = of("999999999999.999999999999", "m");
         const b = of("1.000000000001", "m");
         const result = add(a, b);

         expect(result.value).toBe(1000000000001000000000000n);
         expect(result.unit).toBe("m");
      });

      it("should add very small values", () => {
         const a = of("0.000000000001", "kg");
         const b = of("0.000000000002", "kg");
         const result = add(a, b);

         expect(result.value).toBe(3n);
         expect(result.unit).toBe("kg");
      });

      it("should add negative values", () => {
         const a = of("-10.5", "m");
         const b = of("-5.25", "m");
         const result = add(a, b);

         expect(result.value).toBe(-15750000000000n);
         expect(result.unit).toBe("m");
      });

      it("should work with zero() helper", () => {
         const a = of("10.5", "L");
         const b = zero("L");
         const result = add(a, b);

         expect(result.value).toBe(10500000000000n);
         expect(result.unit).toBe("L");
      });

      it("should preserve category", () => {
         const a = of("10", "m");
         const b = of("5", "m");
         const result = add(a, b);

         expect(result.category).toBe("length");
      });
   });

   describe("subtract()", () => {
      it("should subtract two measurements with same unit", () => {
         const a = of("10.5", "m");
         const b = of("5.25", "m");
         const result = subtract(a, b);

         expect(result.value).toBe(5250000000000n);
         expect(result.unit).toBe("m");
         expect(result.scale).toBe(12);
      });

      it("should subtract measurements resulting in negative value", () => {
         const a = of("5.25", "kg");
         const b = of("10.5", "kg");
         const result = subtract(a, b);

         expect(result.value).toBe(-5250000000000n);
         expect(result.unit).toBe("kg");
      });

      it("should subtract zero from measurement", () => {
         const a = of("10.5", "L");
         const b = of("0", "L");
         const result = subtract(a, b);

         expect(result.value).toBe(10500000000000n);
         expect(result.unit).toBe("L");
      });

      it("should subtract measurement from itself to get zero", () => {
         const a = of("10.5", "m");
         const b = of("10.5", "m");
         const result = subtract(a, b);

         expect(result.value).toBe(0n);
         expect(result.unit).toBe("m");
      });

      it("should throw UnitMismatchError for different units", () => {
         const a = of("10", "m");
         const b = of("5", "kg");

         expect(() => subtract(a, b)).toThrow(UnitMismatchError);
      });

      it("should throw UnitMismatchError for different scales", () => {
         const a = of("10", "m", 12);
         const b = of("5", "m", 6);

         expect(() => subtract(a, b)).toThrow(UnitMismatchError);
      });

      it("should subtract large values", () => {
         const a = of("1000000000000", "m");
         const b = of("999999999999.999999999999", "m");
         const result = subtract(a, b);

         expect(result.value).toBe(1n);
         expect(result.unit).toBe("m");
      });

      it("should subtract very small values", () => {
         const a = of("0.000000000005", "kg");
         const b = of("0.000000000002", "kg");
         const result = subtract(a, b);

         expect(result.value).toBe(3n);
         expect(result.unit).toBe("kg");
      });

      it("should subtract negative from negative", () => {
         const a = of("-10.5", "m");
         const b = of("-5.25", "m");
         const result = subtract(a, b);

         expect(result.value).toBe(-5250000000000n);
         expect(result.unit).toBe("m");
      });

      it("should subtract negative from positive", () => {
         const a = of("10.5", "m");
         const b = of("-5.25", "m");
         const result = subtract(a, b);

         expect(result.value).toBe(15750000000000n);
         expect(result.unit).toBe("m");
      });

      it("should work with zero() helper", () => {
         const a = zero("L");
         const b = of("10.5", "L");
         const result = subtract(a, b);

         expect(result.value).toBe(-10500000000000n);
         expect(result.unit).toBe("L");
      });

      it("should preserve category", () => {
         const a = of("10", "kg");
         const b = of("5", "kg");
         const result = subtract(a, b);

         expect(result.category).toBe("weight");
      });
   });

   describe("multiply()", () => {
      it("should multiply measurement by integer scalar", () => {
         const measurement = of("10.5", "m");
         const result = multiply(measurement, 3);

         expect(result.value).toBe(31500000000000n);
         expect(result.unit).toBe("m");
         expect(result.scale).toBe(12);
      });

      it("should multiply measurement by decimal scalar as number", () => {
         const measurement = of("10", "kg");
         const result = multiply(measurement, 1.5);

         expect(result.value).toBe(15000000000000n);
         expect(result.unit).toBe("kg");
      });

      it("should multiply measurement by decimal scalar as string", () => {
         const measurement = of("10", "L");
         const result = multiply(measurement, "2.5");

         expect(result.value).toBe(25000000000000n);
         expect(result.unit).toBe("L");
      });

      it("should multiply measurement by zero", () => {
         const measurement = of("10.5", "m");
         const result = multiply(measurement, 0);

         expect(result.value).toBe(0n);
         expect(result.unit).toBe("m");
      });

      it("should multiply measurement by negative scalar", () => {
         const measurement = of("10", "kg");
         const result = multiply(measurement, -2);

         expect(result.value).toBe(-20000000000000n);
         expect(result.unit).toBe("kg");
      });

      it("should handle small decimal scalars", () => {
         const measurement = of("100", "m");
         const result = multiply(measurement, "0.01");

         expect(result.value).toBe(1000000000000n);
         expect(result.unit).toBe("m");
      });

      it("should multiply by 1", () => {
         const measurement = of("10.5", "kg");
         const result = multiply(measurement, 1);

         expect(result.value).toBe(10500000000000n);
         expect(result.unit).toBe("kg");
      });

      it("should multiply by large scalar", () => {
         const measurement = of("10", "m");
         const result = multiply(measurement, 1000000);

         expect(result.value).toBe(10000000000000000000n);
         expect(result.unit).toBe("m");
      });

      it("should multiply by very small scalar", () => {
         const measurement = of("100", "kg");
         const result = multiply(measurement, "0.000000000001");

         expect(result.value).toBe(100n);
         expect(result.unit).toBe("kg");
      });

      it("should handle negative measurement and positive scalar", () => {
         const measurement = of("-10", "m");
         const result = multiply(measurement, 2);

         expect(result.value).toBe(-20000000000000n);
         expect(result.unit).toBe("m");
      });

      it("should handle negative measurement and negative scalar", () => {
         const measurement = of("-10", "m");
         const result = multiply(measurement, -2);

         expect(result.value).toBe(20000000000000n);
         expect(result.unit).toBe("m");
      });

      it("should work with zero() helper", () => {
         const measurement = zero("L");
         const result = multiply(measurement, 100);

         expect(result.value).toBe(0n);
         expect(result.unit).toBe("L");
      });

      it("should preserve category", () => {
         const measurement = of("10", "m");
         const result = multiply(measurement, 2);

         expect(result.category).toBe("length");
      });

      it("should handle fractional multiplication", () => {
         const measurement = of("10", "m");
         const result = multiply(measurement, "0.75");

         expect(result.value).toBe(7500000000000n);
         expect(result.unit).toBe("m");
      });
   });

   describe("divide()", () => {
      it("should divide measurement by integer scalar", () => {
         const measurement = of("10", "m");
         const result = divide(measurement, 2);

         expect(result.value).toBe(5000000000000n);
         expect(result.unit).toBe("m");
         expect(result.scale).toBe(12);
      });

      it("should divide measurement by decimal scalar as number", () => {
         const measurement = of("10", "kg");
         const result = divide(measurement, 2.5);

         expect(result.value).toBe(4000000000000n);
         expect(result.unit).toBe("kg");
      });

      it("should divide measurement by decimal scalar as string", () => {
         const measurement = of("10", "L");
         const result = divide(measurement, "2.5");

         expect(result.value).toBe(4000000000000n);
         expect(result.unit).toBe("L");
      });

      it("should divide measurement by negative scalar", () => {
         const measurement = of("10", "m");
         const result = divide(measurement, -2);

         expect(result.value).toBe(-5000000000000n);
         expect(result.unit).toBe("m");
      });

      it("should handle division with truncation", () => {
         const measurement = of("10", "m");
         const result = divide(measurement, 3);

         // 10 / 3 = 3.333333333333 with scale 12
         expect(result.value).toBe(3333333333333n);
         expect(result.unit).toBe("m");
      });

      it("should throw InvalidMeasurementError when dividing by zero", () => {
         const measurement = of("10", "m");

         expect(() => divide(measurement, 0)).toThrow(InvalidMeasurementError);
      });

      it("should throw InvalidMeasurementError when dividing by zero string", () => {
         const measurement = of("10", "m");

         expect(() => divide(measurement, "0")).toThrow(InvalidMeasurementError);
      });

      it("should divide by 1", () => {
         const measurement = of("10.5", "kg");
         const result = divide(measurement, 1);

         expect(result.value).toBe(10500000000000n);
         expect(result.unit).toBe("kg");
      });

      it("should divide by large scalar", () => {
         const measurement = of("1000000", "m");
         const result = divide(measurement, 1000);

         expect(result.value).toBe(1000000000000000n); // 1000 with scale 12
         expect(result.unit).toBe("m");
      });

      it("should divide by very small scalar", () => {
         const measurement = of("10", "kg");
         const result = divide(measurement, "0.000000000001");

         expect(result.value).toBe(10000000000000000000000000n);
         expect(result.unit).toBe("kg");
      });

      it("should handle negative measurement and positive scalar", () => {
         const measurement = of("-10", "m");
         const result = divide(measurement, 2);

         expect(result.value).toBe(-5000000000000n);
         expect(result.unit).toBe("m");
      });

      it("should handle negative measurement and negative scalar", () => {
         const measurement = of("-10", "m");
         const result = divide(measurement, -2);

         expect(result.value).toBe(5000000000000n);
         expect(result.unit).toBe("m");
      });

      it("should handle positive measurement and negative scalar", () => {
         const measurement = of("10", "kg");
         const result = divide(measurement, -5);

         expect(result.value).toBe(-2000000000000n);
         expect(result.unit).toBe("kg");
      });

      it("should work with zero() helper", () => {
         const measurement = zero("L");
         const result = divide(measurement, 100);

         expect(result.value).toBe(0n);
         expect(result.unit).toBe("L");
      });

      it("should preserve category", () => {
         const measurement = of("10", "m");
         const result = divide(measurement, 2);

         expect(result.category).toBe("length");
      });

      it("should handle fractional division", () => {
         const measurement = of("10", "m");
         const result = divide(measurement, "0.5");

         expect(result.value).toBe(20000000000000n);
         expect(result.unit).toBe("m");
      });

      it("should handle division with high precision", () => {
         const measurement = of("1", "kg");
         const result = divide(measurement, 7);

         // 1 / 7 ≈ 0.142857142857 with truncation
         expect(result.value).toBe(142857142857n);
         expect(result.unit).toBe("kg");
      });

      it("should throw for invalid scalar values", () => {
         const measurement = of("10", "m");

         expect(() => divide(measurement, "invalid")).toThrow();
      });
   });

   describe("edge cases across operations", () => {
      it("should handle custom scale measurements", () => {
         const a = of("10.5", "m", 6);
         const b = of("5.25", "m", 6);
         const sum = add(a, b);

         expect(sum.value).toBe(15750000n);
         expect(sum.scale).toBe(6);
      });

      it("should work with different unit categories", () => {
         // Length
         const length1 = of("10", "m");
         const length2 = of("5", "m");
         expect(add(length1, length2).category).toBe("length");

         // Weight
         const weight1 = of("10", "kg");
         const weight2 = of("5", "kg");
         expect(add(weight1, weight2).category).toBe("weight");

         // Volume
         const volume1 = of("10", "L");
         const volume2 = of("5", "L");
         expect(add(volume1, volume2).category).toBe("volume");
      });

      it("should reject cross-category operations", () => {
         const length = of("10", "m");
         const weight = of("5", "kg");

         expect(() => add(length, weight)).toThrow(UnitMismatchError);
         expect(() => subtract(length, weight)).toThrow(UnitMismatchError);
      });
   });
});
