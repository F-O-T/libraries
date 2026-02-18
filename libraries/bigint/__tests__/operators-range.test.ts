import { describe, expect, test } from "bun:test";
import {
   bigintBetweenOperator,
   bigintIsNegativeOperator,
   bigintIsPositiveOperator,
   bigintIsZeroOperator,
} from "../src/plugins/operators/range";
import type { ScaledBigInt } from "../src/schemas";

describe("bigintBetweenOperator", () => {
   test("returns true when value is within range", () => {
      const value: ScaledBigInt = { value: 5n, scale: 0 };
      const range = {
         min: { value: 1n, scale: 0 },
         max: { value: 10n, scale: 0 },
      };

      const result = bigintBetweenOperator.evaluate(value, range);
      expect(result).toBe(true);
   });

   test("returns true when value equals min", () => {
      const value: ScaledBigInt = { value: 1n, scale: 0 };
      const range = {
         min: { value: 1n, scale: 0 },
         max: { value: 10n, scale: 0 },
      };

      const result = bigintBetweenOperator.evaluate(value, range);
      expect(result).toBe(true);
   });

   test("returns true when value equals max", () => {
      const value: ScaledBigInt = { value: 10n, scale: 0 };
      const range = {
         min: { value: 1n, scale: 0 },
         max: { value: 10n, scale: 0 },
      };

      const result = bigintBetweenOperator.evaluate(value, range);
      expect(result).toBe(true);
   });

   test("returns false when value is below min", () => {
      const value: ScaledBigInt = { value: 0n, scale: 0 };
      const range = {
         min: { value: 1n, scale: 0 },
         max: { value: 10n, scale: 0 },
      };

      const result = bigintBetweenOperator.evaluate(value, range);
      expect(result).toBe(false);
   });

   test("returns false when value is above max", () => {
      const value: ScaledBigInt = { value: 11n, scale: 0 };
      const range = {
         min: { value: 1n, scale: 0 },
         max: { value: 10n, scale: 0 },
      };

      const result = bigintBetweenOperator.evaluate(value, range);
      expect(result).toBe(false);
   });

   test("works with scaled values", () => {
      const value: ScaledBigInt = { value: 1500n, scale: 2 }; // 15.00
      const range = {
         min: { value: 1000n, scale: 2 }, // 10.00
         max: { value: 2000n, scale: 2 }, // 20.00
      };

      const result = bigintBetweenOperator.evaluate(value, range);
      expect(result).toBe(true);
   });

   test("throws error on scale mismatch", () => {
      const value: ScaledBigInt = { value: 5n, scale: 0 };
      const range = {
         min: { value: 1n, scale: 0 },
         max: { value: 10n, scale: 2 }, // Different scale
      };

      expect(() => bigintBetweenOperator.evaluate(value, range)).toThrow(
         "Scale mismatch",
      );
   });

   test("throws error when value scale differs from range", () => {
      const value: ScaledBigInt = { value: 5n, scale: 2 };
      const range = {
         min: { value: 1n, scale: 0 },
         max: { value: 10n, scale: 0 },
      };

      expect(() => bigintBetweenOperator.evaluate(value, range)).toThrow(
         "Scale mismatch",
      );
   });
});

describe("bigintIsZeroOperator", () => {
   test("returns true when value is zero and expected is true", () => {
      const value: ScaledBigInt = { value: 0n, scale: 0 };
      const result = bigintIsZeroOperator.evaluate(value, true);
      expect(result).toBe(true);
   });

   test("returns false when value is non-zero and expected is true", () => {
      const value: ScaledBigInt = { value: 5n, scale: 0 };
      const result = bigintIsZeroOperator.evaluate(value, true);
      expect(result).toBe(false);
   });

   test("returns true when value is non-zero and expected is false", () => {
      const value: ScaledBigInt = { value: 5n, scale: 0 };
      const result = bigintIsZeroOperator.evaluate(value, false);
      expect(result).toBe(true);
   });

   test("returns false when value is zero and expected is false", () => {
      const value: ScaledBigInt = { value: 0n, scale: 0 };
      const result = bigintIsZeroOperator.evaluate(value, false);
      expect(result).toBe(false);
   });

   test("works with scaled zero", () => {
      const value: ScaledBigInt = { value: 0n, scale: 2 };
      const result = bigintIsZeroOperator.evaluate(value, true);
      expect(result).toBe(true);
   });

   test("works with negative zero", () => {
      const value: ScaledBigInt = { value: -0n, scale: 0 };
      const result = bigintIsZeroOperator.evaluate(value, true);
      expect(result).toBe(true);
   });
});

describe("bigintIsPositiveOperator", () => {
   test("returns true when value is positive and expected is true", () => {
      const value: ScaledBigInt = { value: 5n, scale: 0 };
      const result = bigintIsPositiveOperator.evaluate(value, true);
      expect(result).toBe(true);
   });

   test("returns false when value is zero and expected is true", () => {
      const value: ScaledBigInt = { value: 0n, scale: 0 };
      const result = bigintIsPositiveOperator.evaluate(value, true);
      expect(result).toBe(false);
   });

   test("returns false when value is negative and expected is true", () => {
      const value: ScaledBigInt = { value: -5n, scale: 0 };
      const result = bigintIsPositiveOperator.evaluate(value, true);
      expect(result).toBe(false);
   });

   test("returns true when value is zero and expected is false", () => {
      const value: ScaledBigInt = { value: 0n, scale: 0 };
      const result = bigintIsPositiveOperator.evaluate(value, false);
      expect(result).toBe(true);
   });

   test("returns true when value is negative and expected is false", () => {
      const value: ScaledBigInt = { value: -5n, scale: 0 };
      const result = bigintIsPositiveOperator.evaluate(value, false);
      expect(result).toBe(true);
   });

   test("returns false when value is positive and expected is false", () => {
      const value: ScaledBigInt = { value: 5n, scale: 0 };
      const result = bigintIsPositiveOperator.evaluate(value, false);
      expect(result).toBe(false);
   });

   test("works with scaled positive value", () => {
      const value: ScaledBigInt = { value: 150n, scale: 2 }; // 1.50
      const result = bigintIsPositiveOperator.evaluate(value, true);
      expect(result).toBe(true);
   });
});

describe("bigintIsNegativeOperator", () => {
   test("returns true when value is negative and expected is true", () => {
      const value: ScaledBigInt = { value: -5n, scale: 0 };
      const result = bigintIsNegativeOperator.evaluate(value, true);
      expect(result).toBe(true);
   });

   test("returns false when value is zero and expected is true", () => {
      const value: ScaledBigInt = { value: 0n, scale: 0 };
      const result = bigintIsNegativeOperator.evaluate(value, true);
      expect(result).toBe(false);
   });

   test("returns false when value is positive and expected is true", () => {
      const value: ScaledBigInt = { value: 5n, scale: 0 };
      const result = bigintIsNegativeOperator.evaluate(value, true);
      expect(result).toBe(false);
   });

   test("returns true when value is zero and expected is false", () => {
      const value: ScaledBigInt = { value: 0n, scale: 0 };
      const result = bigintIsNegativeOperator.evaluate(value, false);
      expect(result).toBe(true);
   });

   test("returns true when value is positive and expected is false", () => {
      const value: ScaledBigInt = { value: 5n, scale: 0 };
      const result = bigintIsNegativeOperator.evaluate(value, false);
      expect(result).toBe(true);
   });

   test("returns false when value is negative and expected is false", () => {
      const value: ScaledBigInt = { value: -5n, scale: 0 };
      const result = bigintIsNegativeOperator.evaluate(value, false);
      expect(result).toBe(false);
   });

   test("works with scaled negative value", () => {
      const value: ScaledBigInt = { value: -150n, scale: 2 }; // -1.50
      const result = bigintIsNegativeOperator.evaluate(value, true);
      expect(result).toBe(true);
   });
});
