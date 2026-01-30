import { beforeEach, describe, expect, test } from "bun:test";
import { UnknownUnitError } from "../../src/errors";
import type { UnitDefinition } from "../../src/types";
import {
   clearCustomUnits,
   getAllUnits,
   getUnit,
   getUnitsByCategory,
   hasUnit,
   registerUnit,
} from "../../src/units/registry";

describe("Unit Registry", () => {
   beforeEach(() => {
      // Clear custom units before each test
      clearCustomUnits();
   });

   describe("getUnit", () => {
      test("returns standard weight unit", () => {
         const kg = getUnit("kg");
         expect(kg.code).toBe("kg");
         expect(kg.name).toBe("Kilogram");
         expect(kg.category).toBe("weight");
      });

      test("returns standard volume unit", () => {
         const l = getUnit("L");
         expect(l.code).toBe("L");
         expect(l.name).toBe("Liter");
         expect(l.category).toBe("volume");
      });

      test("returns standard length unit", () => {
         const m = getUnit("m");
         expect(m.code).toBe("m");
         expect(m.name).toBe("Meter");
         expect(m.category).toBe("length");
      });

      test("returns standard area unit", () => {
         const sqm = getUnit("m2");
         expect(sqm.code).toBe("m2");
         expect(sqm.name).toBe("Square Meter");
         expect(sqm.category).toBe("area");
      });

      test("returns standard temperature unit", () => {
         const c = getUnit("C");
         expect(c.code).toBe("C");
         expect(c.name).toBe("Celsius");
         expect(c.category).toBe("temperature");
      });

      test("throws UnknownUnitError for non-existent unit", () => {
         expect(() => getUnit("xyz")).toThrow(UnknownUnitError);
      });

      test("returns custom unit over standard unit", () => {
         const customKg: UnitDefinition = {
            code: "kg",
            name: "custom kilogram",
            category: "weight",
            baseUnit: "g",
            toBase: (val: number) => val * 1000,
            fromBase: (val: number) => val / 1000,
         };
         registerUnit(customKg);
         const kg = getUnit("kg");
         expect(kg.name).toBe("custom kilogram");
      });
   });

   describe("hasUnit", () => {
      test("returns true for standard units", () => {
         expect(hasUnit("kg")).toBe(true);
         expect(hasUnit("L")).toBe(true);
         expect(hasUnit("m")).toBe(true);
         expect(hasUnit("m2")).toBe(true);
         expect(hasUnit("C")).toBe(true);
      });

      test("returns false for non-existent units", () => {
         expect(hasUnit("xyz")).toBe(false);
      });

      test("returns true for custom units", () => {
         const customUnit: UnitDefinition = {
            code: "custom",
            name: "Custom Unit",
            category: "weight",
            baseUnit: "g",
            toBase: (val: number) => val,
            fromBase: (val: number) => val,
         };
         registerUnit(customUnit);
         expect(hasUnit("custom")).toBe(true);
      });
   });

   describe("registerUnit", () => {
      test("adds custom unit to registry", () => {
         const customUnit: UnitDefinition = {
            code: "custom",
            name: "Custom Unit",
            category: "weight",
            baseUnit: "g",
            toBase: (val: number) => val * 10,
            fromBase: (val: number) => val / 10,
         };
         registerUnit(customUnit);
         const unit = getUnit("custom");
         expect(unit.code).toBe("custom");
         expect(unit.name).toBe("Custom Unit");
      });

      test("registers unit aliases as separate entries", () => {
         const customUnit: UnitDefinition = {
            code: "custom",
            name: "Custom Unit",
            category: "weight",
            baseUnit: "g",
            toBase: (val: number) => val * 10,
            fromBase: (val: number) => val / 10,
            aliases: ["cu", "cust"],
         };
         registerUnit(customUnit);
         expect(hasUnit("custom")).toBe(true);
         expect(hasUnit("cu")).toBe(true);
         expect(hasUnit("cust")).toBe(true);

         const aliasUnit = getUnit("cu");
         expect(aliasUnit.code).toBe("cu");
         expect(aliasUnit.name).toBe("Custom Unit");
      });
   });

   describe("getAllUnits", () => {
      test("returns all standard units", () => {
         const units = getAllUnits();
         expect(units.length).toBeGreaterThan(0);
         expect(units.some((u) => u.code === "kg")).toBe(true);
         expect(units.some((u) => u.code === "L")).toBe(true);
         expect(units.some((u) => u.code === "m")).toBe(true);
         expect(units.some((u) => u.code === "m2")).toBe(true);
         expect(units.some((u) => u.code === "C")).toBe(true);
      });

      test("includes custom units", () => {
         const customUnit: UnitDefinition = {
            code: "custom",
            name: "Custom Unit",
            category: "weight",
            baseUnit: "g",
            toBase: (val: number) => val,
            fromBase: (val: number) => val,
         };
         registerUnit(customUnit);
         const units = getAllUnits();
         expect(units.some((u) => u.code === "custom")).toBe(true);
      });
   });

   describe("clearCustomUnits", () => {
      test("removes only custom units, keeps standard units", () => {
         const customUnit: UnitDefinition = {
            code: "custom",
            name: "Custom Unit",
            category: "weight",
            baseUnit: "g",
            toBase: (val: number) => val,
            fromBase: (val: number) => val,
         };
         registerUnit(customUnit);
         expect(hasUnit("custom")).toBe(true);
         expect(hasUnit("kg")).toBe(true);

         clearCustomUnits();

         expect(hasUnit("custom")).toBe(false);
         expect(hasUnit("kg")).toBe(true);
      });
   });

   describe("getUnitsByCategory", () => {
      test("returns all units in weight category", () => {
         const weightUnits = getUnitsByCategory("weight");
         expect(weightUnits.length).toBeGreaterThan(0);
         expect(weightUnits.every((u) => u.category === "weight")).toBe(true);
         expect(weightUnits.some((u) => u.code === "kg")).toBe(true);
      });

      test("returns all units in volume category", () => {
         const volumeUnits = getUnitsByCategory("volume");
         expect(volumeUnits.length).toBeGreaterThan(0);
         expect(volumeUnits.every((u) => u.category === "volume")).toBe(true);
         expect(volumeUnits.some((u) => u.code === "L")).toBe(true);
      });

      test("returns all units in length category", () => {
         const lengthUnits = getUnitsByCategory("length");
         expect(lengthUnits.length).toBeGreaterThan(0);
         expect(lengthUnits.every((u) => u.category === "length")).toBe(true);
         expect(lengthUnits.some((u) => u.code === "m")).toBe(true);
      });

      test("returns all units in area category", () => {
         const areaUnits = getUnitsByCategory("area");
         expect(areaUnits.length).toBeGreaterThan(0);
         expect(areaUnits.every((u) => u.category === "area")).toBe(true);
         expect(areaUnits.some((u) => u.code === "m2")).toBe(true);
      });

      test("returns all units in temperature category", () => {
         const tempUnits = getUnitsByCategory("temperature");
         expect(tempUnits.length).toBeGreaterThan(0);
         expect(tempUnits.every((u) => u.category === "temperature")).toBe(
            true,
         );
         expect(tempUnits.some((u) => u.code === "C")).toBe(true);
      });

      test("includes custom units in category", () => {
         const customUnit: UnitDefinition = {
            code: "custom",
            name: "Custom Weight",
            category: "weight",
            baseUnit: "g",
            toBase: (val: number) => val,
            fromBase: (val: number) => val,
         };
         registerUnit(customUnit);
         const weightUnits = getUnitsByCategory("weight");
         expect(weightUnits.some((u) => u.code === "custom")).toBe(true);
      });

      test("returns empty array for non-existent category", () => {
         const units = getUnitsByCategory("nonexistent" as any);
         expect(units).toEqual([]);
      });
   });
});
