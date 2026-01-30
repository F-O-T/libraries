import { describe, expect, test } from "bun:test";
import { UnknownUnitError } from "../../src/errors";
import {
   getWeightUnit,
   isWeightUnit,
   WEIGHT_UNITS,
} from "../../src/units/weight";

describe("Weight Units", () => {
   describe("WEIGHT_UNITS", () => {
      test("kg is the base unit", () => {
         expect(WEIGHT_UNITS.kg).toBeDefined();
         expect(WEIGHT_UNITS.kg.code).toBe("kg");
         expect(WEIGHT_UNITS.kg.category).toBe("weight");
         expect(WEIGHT_UNITS.kg.baseUnit).toBe("kg");
         expect(WEIGHT_UNITS.kg.conversionFactor).toBe("1");
      });

      test("lbs has correct conversion factor", () => {
         expect(WEIGHT_UNITS.lbs).toBeDefined();
         expect(WEIGHT_UNITS.lbs.conversionFactor).toBe("0.45359237");
         expect(WEIGHT_UNITS.lbs.baseUnit).toBe("kg");
      });

      test("includes common metric units", () => {
         expect(WEIGHT_UNITS.kg).toBeDefined();
         expect(WEIGHT_UNITS.g).toBeDefined();
         expect(WEIGHT_UNITS.mg).toBeDefined();
         expect(WEIGHT_UNITS.ton).toBeDefined();
      });

      test("includes common imperial units", () => {
         expect(WEIGHT_UNITS.lbs).toBeDefined();
         expect(WEIGHT_UNITS.oz).toBeDefined();
      });

      test("all units have required properties", () => {
         for (const [key, unit] of Object.entries(WEIGHT_UNITS)) {
            expect(unit.code).toBe(key);
            expect(unit.name).toBeDefined();
            expect(unit.category).toBe("weight");
            expect(unit.baseUnit).toBe("kg");
            expect(unit.conversionFactor).toBeDefined();
            expect(unit.symbol).toBeDefined();
            expect(typeof unit.conversionFactor).toBe("string");
         }
      });
   });

   describe("getWeightUnit", () => {
      test("returns unit definition for valid code", () => {
         const kg = getWeightUnit("kg");
         expect(kg.code).toBe("kg");
         expect(kg.category).toBe("weight");
      });

      test("returns unit by alias", () => {
         const lbs = getWeightUnit("lb");
         expect(lbs.code).toBe("lbs");
      });

      test("throws UnknownUnitError for invalid code", () => {
         expect(() => getWeightUnit("invalid")).toThrow(UnknownUnitError);
      });
   });

   describe("isWeightUnit", () => {
      test("returns true for valid unit codes", () => {
         expect(isWeightUnit("kg")).toBe(true);
         expect(isWeightUnit("g")).toBe(true);
         expect(isWeightUnit("lbs")).toBe(true);
      });

      test("returns true for valid aliases", () => {
         expect(isWeightUnit("lb")).toBe(true);
         expect(isWeightUnit("pound")).toBe(true);
      });

      test("returns false for invalid codes", () => {
         expect(isWeightUnit("invalid")).toBe(false);
         expect(isWeightUnit("")).toBe(false);
      });
   });
});
