import { beforeEach, describe, expect, test } from "bun:test";
import {
   clearCFOP,
   getCFOP,
   getCFOPOperation,
   hasCFOP,
   registerCFOP,
   validateCFOP,
} from "../../src/registry/cfop";

describe("CFOP Pre-registration", () => {
   // Test the module initialization with pre-registered codes
   // This test runs FIRST and doesn't clear the registry

   test("common CFOP codes are available on module load", () => {
      // Check internal operations
      expect(hasCFOP("5101")).toBe(true);
      expect(getCFOPOperation("5101")).toBe("internal");

      expect(hasCFOP("5102")).toBe(true);
      expect(getCFOPOperation("5102")).toBe("internal");

      expect(hasCFOP("5405")).toBe(true);
      expect(getCFOPOperation("5405")).toBe("internal");

      expect(hasCFOP("1101")).toBe(true);
      expect(getCFOPOperation("1101")).toBe("internal");

      // Check interstate operations
      expect(hasCFOP("6101")).toBe(true);
      expect(getCFOPOperation("6101")).toBe("interstate");

      expect(hasCFOP("6102")).toBe(true);
      expect(getCFOPOperation("6102")).toBe("interstate");

      expect(hasCFOP("6108")).toBe(true);
      expect(getCFOPOperation("6108")).toBe("interstate");

      expect(hasCFOP("2101")).toBe(true);
      expect(getCFOPOperation("2101")).toBe("interstate");
   });

   test("pre-registered codes have correct descriptions", () => {
      const cfop5101 = getCFOP("5101");
      expect(cfop5101.description).toContain("Sale");
      expect(cfop5101.description).toContain("state");

      const cfop6101 = getCFOP("6101");
      expect(cfop6101.description).toContain("Sale");
      expect(cfop6101.description).toContain("state");
   });
});

describe("CFOP Registry", () => {
   // Note: CFOP registry is pre-populated with common codes
   // We clear and re-initialize for consistent testing
   beforeEach(() => {
      clearCFOP();
   });

   describe("validateCFOP", () => {
      test("accepts valid 4-digit CFOP codes", () => {
         expect(() => validateCFOP("1234")).not.toThrow();
         expect(() => validateCFOP("0000")).not.toThrow();
         expect(() => validateCFOP("9999")).not.toThrow();
         expect(() => validateCFOP("5101")).not.toThrow();
      });

      test("rejects CFOP codes with less than 4 digits", () => {
         expect(() => validateCFOP("123")).toThrow(
            "CFOP code must be exactly 4 digits",
         );
         expect(() => validateCFOP("12")).toThrow(
            "CFOP code must be exactly 4 digits",
         );
         expect(() => validateCFOP("")).toThrow(
            "CFOP code must be exactly 4 digits",
         );
      });

      test("rejects CFOP codes with more than 4 digits", () => {
         expect(() => validateCFOP("12345")).toThrow(
            "CFOP code must be exactly 4 digits",
         );
         expect(() => validateCFOP("123456")).toThrow(
            "CFOP code must be exactly 4 digits",
         );
      });

      test("rejects CFOP codes with non-digit characters", () => {
         expect(() => validateCFOP("123A")).toThrow(
            "CFOP code must be exactly 4 digits",
         );
         expect(() => validateCFOP("12-34")).toThrow(
            "CFOP code must be exactly 4 digits",
         );
         expect(() => validateCFOP("12.34")).toThrow(
            "CFOP code must be exactly 4 digits",
         );
      });
   });

   describe("registerCFOP", () => {
      test("registers CFOP code with description and operation", () => {
         registerCFOP("1234", "Test Operation", "internal");
         expect(hasCFOP("1234")).toBe(true);
      });

      test("registers CFOP code with notes", () => {
         registerCFOP("1234", "Test Operation", "internal", "Additional notes");
         const cfop = getCFOP("1234");
         expect(cfop.notes).toBe("Additional notes");
      });

      test("throws error for invalid CFOP code format", () => {
         expect(() => registerCFOP("123", "Test", "internal")).toThrow(
            "CFOP code must be exactly 4 digits",
         );
      });

      test("overwrites existing CFOP registration", () => {
         registerCFOP("1234", "First Description", "internal");
         registerCFOP("1234", "Second Description", "interstate");
         const cfop = getCFOP("1234");
         expect(cfop.description).toBe("Second Description");
         expect(cfop.operation).toBe("interstate");
      });
   });

   describe("getCFOP", () => {
      test("returns CFOP details for registered code", () => {
         registerCFOP("1234", "Test Operation", "internal", "Some notes");
         const cfop = getCFOP("1234");
         expect(cfop).toEqual({
            code: "1234",
            description: "Test Operation",
            operation: "internal",
            notes: "Some notes",
         });
      });

      test("returns CFOP details without notes when not provided", () => {
         registerCFOP("1234", "Test Operation", "interstate");
         const cfop = getCFOP("1234");
         expect(cfop).toEqual({
            code: "1234",
            description: "Test Operation",
            operation: "interstate",
         });
         expect(cfop.notes).toBeUndefined();
      });

      test("throws error for unregistered CFOP code", () => {
         expect(() => getCFOP("1234")).toThrow(
            "CFOP code 1234 is not registered",
         );
      });

      test("throws error for invalid CFOP code format", () => {
         expect(() => getCFOP("123")).toThrow(
            "CFOP code must be exactly 4 digits",
         );
      });
   });

   describe("hasCFOP", () => {
      test("returns true for registered CFOP code", () => {
         registerCFOP("1234", "Test Operation", "internal");
         expect(hasCFOP("1234")).toBe(true);
      });

      test("returns false for unregistered CFOP code", () => {
         expect(hasCFOP("1234")).toBe(false);
      });

      test("throws error for invalid CFOP code format", () => {
         expect(() => hasCFOP("123")).toThrow(
            "CFOP code must be exactly 4 digits",
         );
      });
   });

   describe("getCFOPOperation", () => {
      test("returns operation type for registered CFOP", () => {
         registerCFOP("1234", "Test", "internal");
         expect(getCFOPOperation("1234")).toBe("internal");

         registerCFOP("5678", "Test", "interstate");
         expect(getCFOPOperation("5678")).toBe("interstate");
      });

      test("throws error for unregistered CFOP code", () => {
         expect(() => getCFOPOperation("1234")).toThrow(
            "CFOP code 1234 is not registered",
         );
      });

      test("throws error for invalid CFOP code format", () => {
         expect(() => getCFOPOperation("123")).toThrow(
            "CFOP code must be exactly 4 digits",
         );
      });
   });

   describe("clearCFOP", () => {
      test("removes all registered CFOP codes", () => {
         registerCFOP("1234", "Operation 1", "internal");
         registerCFOP("5678", "Operation 2", "interstate");
         registerCFOP("9999", "Operation 3", "internal");

         expect(hasCFOP("1234")).toBe(true);
         expect(hasCFOP("5678")).toBe(true);
         expect(hasCFOP("9999")).toBe(true);

         clearCFOP();

         expect(hasCFOP("1234")).toBe(false);
         expect(hasCFOP("5678")).toBe(false);
         expect(hasCFOP("9999")).toBe(false);
      });

      test("works when registry is already empty", () => {
         expect(() => clearCFOP()).not.toThrow();
         expect(() => clearCFOP()).not.toThrow();
      });
   });

   describe("Pre-registered common CFOP codes", () => {
      // Test that common codes are NOT present after clearCFOP
      // We'll add a separate test file or method to test pre-registration

      test("5101 - Sale within state", () => {
         registerCFOP("5101", "Sale within state", "internal");
         const cfop = getCFOP("5101");
         expect(cfop.operation).toBe("internal");
         expect(cfop.description).toContain("Sale within state");
      });

      test("5102 - Sale within state - free or non-taxable", () => {
         registerCFOP(
            "5102",
            "Sale within state - free or non-taxable",
            "internal",
         );
         const cfop = getCFOP("5102");
         expect(cfop.operation).toBe("internal");
      });

      test("5405 - Sale for delivery to the buyer", () => {
         registerCFOP("5405", "Sale for delivery to the buyer", "internal");
         const cfop = getCFOP("5405");
         expect(cfop.operation).toBe("internal");
      });

      test("6101 - Sale to another state", () => {
         registerCFOP("6101", "Sale to another state", "interstate");
         const cfop = getCFOP("6101");
         expect(cfop.operation).toBe("interstate");
      });

      test("6102 - Sale to another state - free or non-taxable", () => {
         registerCFOP(
            "6102",
            "Sale to another state - free or non-taxable",
            "interstate",
         );
         const cfop = getCFOP("6102");
         expect(cfop.operation).toBe("interstate");
      });

      test("6108 - Sale to another state - subject to tax substitution", () => {
         registerCFOP(
            "6108",
            "Sale to another state - subject to tax substitution",
            "interstate",
         );
         const cfop = getCFOP("6108");
         expect(cfop.operation).toBe("interstate");
      });

      test("1101 - Purchase within state", () => {
         registerCFOP("1101", "Purchase within state", "internal");
         const cfop = getCFOP("1101");
         expect(cfop.operation).toBe("internal");
      });

      test("2101 - Purchase from another state", () => {
         registerCFOP("2101", "Purchase from another state", "interstate");
         const cfop = getCFOP("2101");
         expect(cfop.operation).toBe("interstate");
      });
   });
});
