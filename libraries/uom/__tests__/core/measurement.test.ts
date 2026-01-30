import { describe, expect, it } from "bun:test";
import { createMeasurement, of, zero } from "../../src/core/measurement";

describe("measurement factory functions", () => {
   describe("of()", () => {
      it("should create measurement from string", () => {
         const result = of("10.5", "m");

         expect(result.value).toBe(10500000000000n);
         expect(result.unit).toBe("m");
         expect(result.scale).toBe(12);
      });

      it("should create measurement from number", () => {
         const result = of(25.75, "kg");

         expect(result.value).toBe(25750000000000n);
         expect(result.unit).toBe("kg");
         expect(result.scale).toBe(12);
      });

      it("should create measurement with custom scale", () => {
         const result = of("100.5", "m", 6);

         expect(result.value).toBe(100500000n);
         expect(result.scale).toBe(6);
      });

      it("should throw for invalid unit", () => {
         expect(() => of(10, "invalid-unit")).toThrow();
      });
   });

   describe("zero()", () => {
      it("should create zero measurement", () => {
         const result = zero("m");

         expect(result.value).toBe(0n);
         expect(result.unit).toBe("m");
         expect(result.scale).toBe(12);
      });

      it("should create zero measurement with custom scale", () => {
         const result = zero("kg", 6);

         expect(result.value).toBe(0n);
         expect(result.scale).toBe(6);
      });
   });

   describe("createMeasurement()", () => {
      it("should create measurement from internal values", () => {
         const result = createMeasurement(5000000000000n, "m", 12, "length");

         expect(result.value).toBe(5000000000000n);
         expect(result.unit).toBe("m");
         expect(result.scale).toBe(12);
         expect(result.category).toBe("length");
      });
   });
});
