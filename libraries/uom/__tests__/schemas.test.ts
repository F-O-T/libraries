import { describe, expect, it } from "bun:test";
import {
   MeasurementInputSchema,
   MeasurementJSONSchema,
   MeasurementSchema,
   UnitCategorySchema,
   UnitDefinitionSchema,
} from "../src/schemas";

describe("UnitCategorySchema", () => {
   it("should accept valid unit categories", () => {
      expect(UnitCategorySchema.parse("weight")).toBe("weight");
      expect(UnitCategorySchema.parse("volume")).toBe("volume");
      expect(UnitCategorySchema.parse("length")).toBe("length");
      expect(UnitCategorySchema.parse("area")).toBe("area");
      expect(UnitCategorySchema.parse("temperature")).toBe("temperature");
   });

   it("should reject invalid unit categories", () => {
      expect(() => UnitCategorySchema.parse("invalid")).toThrow();
      expect(() => UnitCategorySchema.parse("")).toThrow();
      expect(() => UnitCategorySchema.parse(123)).toThrow();
   });
});

describe("MeasurementSchema", () => {
   it("should accept valid measurement with all fields", () => {
      const valid = {
         value: "1000000000000000000000",
         unit: "kg",
         scale: 10,
         category: "weight",
      };
      const result = MeasurementSchema.parse(valid);
      expect(result).toEqual(valid);
   });

   it("should require value as string", () => {
      const invalid = {
         value: 123,
         unit: "kg",
         scale: 10,
         category: "weight",
      };
      expect(() => MeasurementSchema.parse(invalid)).toThrow();
   });

   it("should require unit as string", () => {
      const invalid = {
         value: "1000",
         unit: 123,
         scale: 10,
         category: "weight",
      };
      expect(() => MeasurementSchema.parse(invalid)).toThrow();
   });

   it("should enforce scale between 0 and 20", () => {
      const valid0 = {
         value: "1000",
         unit: "kg",
         scale: 0,
         category: "weight",
      };
      expect(MeasurementSchema.parse(valid0).scale).toBe(0);

      const valid20 = {
         value: "1000",
         unit: "kg",
         scale: 20,
         category: "weight",
      };
      expect(MeasurementSchema.parse(valid20).scale).toBe(20);

      const invalidNegative = {
         value: "1000",
         unit: "kg",
         scale: -1,
         category: "weight",
      };
      expect(() => MeasurementSchema.parse(invalidNegative)).toThrow();

      const invalidTooHigh = {
         value: "1000",
         unit: "kg",
         scale: 21,
         category: "weight",
      };
      expect(() => MeasurementSchema.parse(invalidTooHigh)).toThrow();
   });

   it("should require valid category", () => {
      const invalid = {
         value: "1000",
         unit: "kg",
         scale: 10,
         category: "invalid",
      };
      expect(() => MeasurementSchema.parse(invalid)).toThrow();
   });
});

describe("MeasurementInputSchema", () => {
   it("should accept string value", () => {
      const valid = {
         value: "123.45",
         unit: "kg",
      };
      const result = MeasurementInputSchema.parse(valid);
      expect(result).toEqual(valid);
   });

   it("should accept number value", () => {
      const valid = {
         value: 123.45,
         unit: "kg",
      };
      const result = MeasurementInputSchema.parse(valid);
      expect(result).toEqual(valid);
   });

   it("should require unit", () => {
      const invalid = {
         value: 123.45,
      };
      expect(() => MeasurementInputSchema.parse(invalid)).toThrow();
   });

   it("should reject invalid value types", () => {
      const invalid = {
         value: null,
         unit: "kg",
      };
      expect(() => MeasurementInputSchema.parse(invalid)).toThrow();
   });
});

describe("UnitDefinitionSchema", () => {
   it("should accept valid unit definition with all fields", () => {
      const valid = {
         code: "kg",
         name: "kilogram",
         category: "weight",
         baseUnit: "g",
         conversionFactor: "1000",
         symbol: "kg",
         aliases: ["kilo", "kilogramme"],
      };
      const result = UnitDefinitionSchema.parse(valid);
      expect(result).toEqual(valid);
   });

   it("should accept unit definition without optional fields", () => {
      const valid = {
         code: "kg",
         name: "kilogram",
         category: "weight",
         baseUnit: "g",
         conversionFactor: "1000",
      };
      const result = UnitDefinitionSchema.parse(valid);
      expect(result).toEqual(valid);
      expect(result.symbol).toBeUndefined();
      expect(result.aliases).toBeUndefined();
   });

   it("should require code, name, category, baseUnit, conversionFactor", () => {
      const missingCode = {
         name: "kilogram",
         category: "weight",
         baseUnit: "g",
         conversionFactor: "1000",
      };
      expect(() => UnitDefinitionSchema.parse(missingCode)).toThrow();

      const missingName = {
         code: "kg",
         category: "weight",
         baseUnit: "g",
         conversionFactor: "1000",
      };
      expect(() => UnitDefinitionSchema.parse(missingName)).toThrow();
   });

   it("should require conversionFactor as string", () => {
      const invalid = {
         code: "kg",
         name: "kilogram",
         category: "weight",
         baseUnit: "g",
         conversionFactor: 1000,
      };
      expect(() => UnitDefinitionSchema.parse(invalid)).toThrow();
   });

   it("should require aliases as array of strings if provided", () => {
      const invalid = {
         code: "kg",
         name: "kilogram",
         category: "weight",
         baseUnit: "g",
         conversionFactor: "1000",
         aliases: "kilo",
      };
      expect(() => UnitDefinitionSchema.parse(invalid)).toThrow();
   });
});

describe("MeasurementJSONSchema", () => {
   it("should accept measurement JSON with all fields", () => {
      const valid = {
         value: "1000000000000000000000",
         unit: "kg",
         category: "weight",
      };
      const result = MeasurementJSONSchema.parse(valid);
      expect(result).toEqual(valid);
   });

   it("should accept measurement JSON without category", () => {
      const valid = {
         value: "1000",
         unit: "kg",
      };
      const result = MeasurementJSONSchema.parse(valid);
      expect(result).toEqual(valid);
      expect(result.category).toBeUndefined();
   });

   it("should require value and unit", () => {
      const missingValue = {
         unit: "kg",
      };
      expect(() => MeasurementJSONSchema.parse(missingValue)).toThrow();

      const missingUnit = {
         value: "1000",
      };
      expect(() => MeasurementJSONSchema.parse(missingUnit)).toThrow();
   });

   it("should require value as string", () => {
      const invalid = {
         value: 1000,
         unit: "kg",
      };
      expect(() => MeasurementJSONSchema.parse(invalid)).toThrow();
   });
});
