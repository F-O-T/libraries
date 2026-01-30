import { beforeEach, describe, expect, test } from "bun:test";
import {
   clearNCM,
   getNCM,
   hasNCM,
   registerNCM,
   validateNCM,
} from "../../src/registry/ncm";

describe("NCM Registry", () => {
   beforeEach(() => {
      clearNCM();
   });

   describe("validateNCM", () => {
      test("accepts valid 8-digit NCM codes", () => {
         expect(() => validateNCM("12345678")).not.toThrow();
         expect(() => validateNCM("00000000")).not.toThrow();
         expect(() => validateNCM("99999999")).not.toThrow();
      });

      test("rejects NCM codes with less than 8 digits", () => {
         expect(() => validateNCM("1234567")).toThrow(
            "NCM code must be exactly 8 digits",
         );
         expect(() => validateNCM("123")).toThrow(
            "NCM code must be exactly 8 digits",
         );
         expect(() => validateNCM("")).toThrow(
            "NCM code must be exactly 8 digits",
         );
      });

      test("rejects NCM codes with more than 8 digits", () => {
         expect(() => validateNCM("123456789")).toThrow(
            "NCM code must be exactly 8 digits",
         );
         expect(() => validateNCM("12345678901")).toThrow(
            "NCM code must be exactly 8 digits",
         );
      });

      test("rejects NCM codes with non-digit characters", () => {
         expect(() => validateNCM("1234567A")).toThrow(
            "NCM code must be exactly 8 digits",
         );
         expect(() => validateNCM("1234-5678")).toThrow(
            "NCM code must be exactly 8 digits",
         );
         expect(() => validateNCM("12.34.56.78")).toThrow(
            "NCM code must be exactly 8 digits",
         );
      });
   });

   describe("registerNCM", () => {
      test("registers NCM code with description", () => {
         registerNCM("12345678", "Test Product");
         expect(hasNCM("12345678")).toBe(true);
      });

      test("registers NCM code with description and notes", () => {
         registerNCM("12345678", "Test Product", "Additional notes here");
         const ncm = getNCM("12345678");
         expect(ncm.notes).toBe("Additional notes here");
      });

      test("throws error for invalid NCM code format", () => {
         expect(() => registerNCM("123", "Test")).toThrow(
            "NCM code must be exactly 8 digits",
         );
      });

      test("overwrites existing NCM registration", () => {
         registerNCM("12345678", "First Description");
         registerNCM("12345678", "Second Description");
         const ncm = getNCM("12345678");
         expect(ncm.description).toBe("Second Description");
      });
   });

   describe("getNCM", () => {
      test("returns NCM details for registered code", () => {
         registerNCM("12345678", "Test Product", "Some notes");
         const ncm = getNCM("12345678");
         expect(ncm).toEqual({
            code: "12345678",
            description: "Test Product",
            notes: "Some notes",
         });
      });

      test("returns NCM details without notes when not provided", () => {
         registerNCM("12345678", "Test Product");
         const ncm = getNCM("12345678");
         expect(ncm).toEqual({
            code: "12345678",
            description: "Test Product",
         });
         expect(ncm.notes).toBeUndefined();
      });

      test("throws error for unregistered NCM code", () => {
         expect(() => getNCM("12345678")).toThrow(
            "NCM code 12345678 is not registered",
         );
      });

      test("throws error for invalid NCM code format", () => {
         expect(() => getNCM("123")).toThrow(
            "NCM code must be exactly 8 digits",
         );
      });
   });

   describe("hasNCM", () => {
      test("returns true for registered NCM code", () => {
         registerNCM("12345678", "Test Product");
         expect(hasNCM("12345678")).toBe(true);
      });

      test("returns false for unregistered NCM code", () => {
         expect(hasNCM("12345678")).toBe(false);
      });

      test("throws error for invalid NCM code format", () => {
         expect(() => hasNCM("123")).toThrow(
            "NCM code must be exactly 8 digits",
         );
      });
   });

   describe("clearNCM", () => {
      test("removes all registered NCM codes", () => {
         registerNCM("12345678", "Product 1");
         registerNCM("87654321", "Product 2");
         registerNCM("11111111", "Product 3");

         expect(hasNCM("12345678")).toBe(true);
         expect(hasNCM("87654321")).toBe(true);
         expect(hasNCM("11111111")).toBe(true);

         clearNCM();

         expect(hasNCM("12345678")).toBe(false);
         expect(hasNCM("87654321")).toBe(false);
         expect(hasNCM("11111111")).toBe(false);
      });

      test("works when registry is already empty", () => {
         expect(() => clearNCM()).not.toThrow();
         expect(() => clearNCM()).not.toThrow();
      });
   });
});
