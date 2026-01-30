import { describe, expect, test } from "bun:test";
import {
   getVolumeUnit,
   isVolumeUnit,
   VOLUME_UNITS,
} from "../../src/units/volume";

describe("Volume Units", () => {
   test("should have L as base unit", () => {
      const L = VOLUME_UNITS.L;
      expect(L.baseUnit).toBe("L");
      expect(L.conversionFactor).toBe("1");
      expect(L.category).toBe("volume");
   });

   test("should have common metric units", () => {
      expect(VOLUME_UNITS.L).toBeDefined();
      expect(VOLUME_UNITS.mL).toBeDefined();
      expect(VOLUME_UNITS.m3).toBeDefined();
   });

   test("should have common imperial units", () => {
      expect(VOLUME_UNITS.gal).toBeDefined();
      expect(VOLUME_UNITS.qt).toBeDefined();
      expect(VOLUME_UNITS.pt).toBeDefined();
      expect(VOLUME_UNITS["fl-oz"]).toBeDefined();
   });

   test("getVolumeUnit should retrieve unit by code", () => {
      const unit = getVolumeUnit("L");
      expect(unit.code).toBe("L");
      expect(unit.name).toBe("Liter");
   });

   test("getVolumeUnit should retrieve unit by alias", () => {
      const unit = getVolumeUnit("liter");
      expect(unit.code).toBe("L");
   });

   test("isVolumeUnit should return true for valid units", () => {
      expect(isVolumeUnit("L")).toBe(true);
      expect(isVolumeUnit("mL")).toBe(true);
      expect(isVolumeUnit("liter")).toBe(true);
   });

   test("isVolumeUnit should return false for invalid units", () => {
      expect(isVolumeUnit("invalid")).toBe(false);
      expect(isVolumeUnit("kg")).toBe(false);
   });
});
