import { describe, expect, test } from "bun:test";
import {
   CategoryMismatchError,
   ConversionError,
   InvalidMeasurementError,
   UnitMismatchError,
   UnknownUnitError,
   UOMError,
} from "../src/errors";

describe("UOMError", () => {
   test("should be base error class", () => {
      const error = new UOMError("Test error");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(UOMError);
      expect(error.message).toBe("Test error");
      expect(error.name).toBe("UOMError");
   });
});

describe("UnitMismatchError", () => {
   test("should include unit properties", () => {
      const error = new UnitMismatchError("m", "kg");
      expect(error).toBeInstanceOf(UOMError);
      expect(error).toBeInstanceOf(UnitMismatchError);
      expect(error.unitA).toBe("m");
      expect(error.unitB).toBe("kg");
      expect(error.message).toContain("m");
      expect(error.message).toContain("kg");
      expect(error.name).toBe("UnitMismatchError");
   });
});

describe("CategoryMismatchError", () => {
   test("should include category properties", () => {
      const error = new CategoryMismatchError("length", "mass");
      expect(error).toBeInstanceOf(UOMError);
      expect(error).toBeInstanceOf(CategoryMismatchError);
      expect(error.categoryA).toBe("length");
      expect(error.categoryB).toBe("mass");
      expect(error.message).toContain("length");
      expect(error.message).toContain("mass");
      expect(error.name).toBe("CategoryMismatchError");
   });
});

describe("UnknownUnitError", () => {
   test("should include unit code property", () => {
      const error = new UnknownUnitError("XYZ");
      expect(error).toBeInstanceOf(UOMError);
      expect(error).toBeInstanceOf(UnknownUnitError);
      expect(error.unitCode).toBe("XYZ");
      expect(error.message).toContain("XYZ");
      expect(error.name).toBe("UnknownUnitError");
   });
});

describe("InvalidMeasurementError", () => {
   test("should handle invalid values", () => {
      const error = new InvalidMeasurementError("Value must be positive");
      expect(error).toBeInstanceOf(UOMError);
      expect(error).toBeInstanceOf(InvalidMeasurementError);
      expect(error.message).toBe("Value must be positive");
      expect(error.name).toBe("InvalidMeasurementError");
   });
});

describe("ConversionError", () => {
   test("should include conversion details", () => {
      const error = new ConversionError("m", "kg", "Incompatible units");
      expect(error).toBeInstanceOf(UOMError);
      expect(error).toBeInstanceOf(ConversionError);
      expect(error.fromUnit).toBe("m");
      expect(error.toUnit).toBe("kg");
      expect(error.reason).toBe("Incompatible units");
      expect(error.message).toContain("m");
      expect(error.message).toContain("kg");
      expect(error.message).toContain("Incompatible units");
      expect(error.name).toBe("ConversionError");
   });
});
