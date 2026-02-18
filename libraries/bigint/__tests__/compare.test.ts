import { describe, expect, test } from "bun:test";
import {
   compare,
   equals,
   greaterThan,
   greaterThanOrEqual,
   isNegative,
   isPositive,
   isZero,
   lessThan,
   lessThanOrEqual,
} from "../src/compare";

describe("compare", () => {
   test("returns -1 when a < b", () => {
      expect(compare({ a: 100n, b: 200n, scale: 2 })).toBe(-1);
   });

   test("returns 0 when a = b", () => {
      expect(compare({ a: 100n, b: 100n, scale: 2 })).toBe(0);
   });

   test("returns 1 when a > b", () => {
      expect(compare({ a: 200n, b: 100n, scale: 2 })).toBe(1);
   });

   test("compares negative numbers correctly", () => {
      expect(compare({ a: -100n, b: -200n, scale: 2 })).toBe(1);
      expect(compare({ a: -200n, b: -100n, scale: 2 })).toBe(-1);
   });

   test("compares negative and positive", () => {
      expect(compare({ a: -100n, b: 100n, scale: 2 })).toBe(-1);
      expect(compare({ a: 100n, b: -100n, scale: 2 })).toBe(1);
   });

   test("throws on negative scale", () => {
      expect(() => compare({ a: 100n, b: 200n, scale: -1 })).toThrow();
   });
});

describe("equals", () => {
   test("returns true when values are equal", () => {
      expect(equals({ a: 100n, b: 100n, scale: 2 })).toBe(true);
   });

   test("returns false when values are not equal", () => {
      expect(equals({ a: 100n, b: 200n, scale: 2 })).toBe(false);
   });

   test("returns true for zero comparison", () => {
      expect(equals({ a: 0n, b: 0n, scale: 2 })).toBe(true);
   });

   test("returns true for negative equal values", () => {
      expect(equals({ a: -100n, b: -100n, scale: 2 })).toBe(true);
   });

   test("returns false for different signs", () => {
      expect(equals({ a: 100n, b: -100n, scale: 2 })).toBe(false);
   });
});

describe("greaterThan", () => {
   test("returns true when a > b", () => {
      expect(greaterThan({ a: 200n, b: 100n, scale: 2 })).toBe(true);
   });

   test("returns false when a < b", () => {
      expect(greaterThan({ a: 100n, b: 200n, scale: 2 })).toBe(false);
   });

   test("returns false when a = b", () => {
      expect(greaterThan({ a: 100n, b: 100n, scale: 2 })).toBe(false);
   });

   test("returns true for positive > negative", () => {
      expect(greaterThan({ a: 100n, b: -100n, scale: 2 })).toBe(true);
   });
});

describe("greaterThanOrEqual", () => {
   test("returns true when a > b", () => {
      expect(greaterThanOrEqual({ a: 200n, b: 100n, scale: 2 })).toBe(true);
   });

   test("returns true when a = b", () => {
      expect(greaterThanOrEqual({ a: 100n, b: 100n, scale: 2 })).toBe(true);
   });

   test("returns false when a < b", () => {
      expect(greaterThanOrEqual({ a: 100n, b: 200n, scale: 2 })).toBe(false);
   });
});

describe("lessThan", () => {
   test("returns true when a < b", () => {
      expect(lessThan({ a: 100n, b: 200n, scale: 2 })).toBe(true);
   });

   test("returns false when a > b", () => {
      expect(lessThan({ a: 200n, b: 100n, scale: 2 })).toBe(false);
   });

   test("returns false when a = b", () => {
      expect(lessThan({ a: 100n, b: 100n, scale: 2 })).toBe(false);
   });

   test("returns true for negative < positive", () => {
      expect(lessThan({ a: -100n, b: 100n, scale: 2 })).toBe(true);
   });
});

describe("lessThanOrEqual", () => {
   test("returns true when a < b", () => {
      expect(lessThanOrEqual({ a: 100n, b: 200n, scale: 2 })).toBe(true);
   });

   test("returns true when a = b", () => {
      expect(lessThanOrEqual({ a: 100n, b: 100n, scale: 2 })).toBe(true);
   });

   test("returns false when a > b", () => {
      expect(lessThanOrEqual({ a: 200n, b: 100n, scale: 2 })).toBe(false);
   });
});

describe("isZero", () => {
   test("returns true for zero", () => {
      expect(isZero({ a: 0n, b: 0n, scale: 2 })).toBe(true);
   });

   test("returns false for positive number", () => {
      expect(isZero({ a: 100n, b: 0n, scale: 2 })).toBe(false);
   });

   test("returns false for negative number", () => {
      expect(isZero({ a: -100n, b: 0n, scale: 2 })).toBe(false);
   });
});

describe("isPositive", () => {
   test("returns true for positive number", () => {
      expect(isPositive({ a: 100n, b: 0n, scale: 2 })).toBe(true);
   });

   test("returns false for zero", () => {
      expect(isPositive({ a: 0n, b: 0n, scale: 2 })).toBe(false);
   });

   test("returns false for negative number", () => {
      expect(isPositive({ a: -100n, b: 0n, scale: 2 })).toBe(false);
   });
});

describe("isNegative", () => {
   test("returns true for negative number", () => {
      expect(isNegative({ a: -100n, b: 0n, scale: 2 })).toBe(true);
   });

   test("returns false for zero", () => {
      expect(isNegative({ a: 0n, b: 0n, scale: 2 })).toBe(false);
   });

   test("returns false for positive number", () => {
      expect(isNegative({ a: 100n, b: 0n, scale: 2 })).toBe(false);
   });
});
