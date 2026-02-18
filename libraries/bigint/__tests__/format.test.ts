import { describe, expect, test } from "bun:test";
import { formatFromBigInt } from "../src/format";

describe("formatFromBigInt", () => {
   describe("basic formatting", () => {
      test("formats positive decimal", () => {
         expect(formatFromBigInt({ value: 12345n, scale: 2 })).toBe("123.45");
      });

      test("formats negative decimal", () => {
         expect(formatFromBigInt({ value: -12345n, scale: 2 })).toBe("-123.45");
      });

      test("formats zero", () => {
         expect(formatFromBigInt({ value: 0n, scale: 2 })).toBe("0");
      });

      test("formats integer (scale 0)", () => {
         expect(formatFromBigInt({ value: 123n, scale: 0 })).toBe("123");
      });

      test("formats negative integer", () => {
         expect(formatFromBigInt({ value: -123n, scale: 0 })).toBe("-123");
      });
   });

   describe("trailing zeros", () => {
      test("trims trailing zeros by default", () => {
         expect(formatFromBigInt({ value: 12300n, scale: 2 })).toBe("123");
      });

      test("trims trailing zeros with explicit true", () => {
         expect(
            formatFromBigInt({
               value: 12300n,
               scale: 2,
               trimTrailingZeros: true,
            }),
         ).toBe("123");
      });

      test("preserves trailing zeros when requested", () => {
         expect(
            formatFromBigInt({
               value: 12300n,
               scale: 2,
               trimTrailingZeros: false,
            }),
         ).toBe("123.00");
      });

      test("trims zeros after decimal point", () => {
         expect(formatFromBigInt({ value: 12340n, scale: 2 })).toBe("123.4");
      });

      test("preserves significant trailing zeros", () => {
         expect(
            formatFromBigInt({
               value: 12340n,
               scale: 2,
               trimTrailingZeros: false,
            }),
         ).toBe("123.40");
      });

      test("trims all zeros leaving integer", () => {
         expect(formatFromBigInt({ value: 100000n, scale: 5 })).toBe("1");
      });

      test("preserves all decimal zeros when requested", () => {
         expect(
            formatFromBigInt({
               value: 100000n,
               scale: 5,
               trimTrailingZeros: false,
            }),
         ).toBe("1.00000");
      });
   });

   describe("padding and precision", () => {
      test("pads with leading zeros when value smaller than scale", () => {
         expect(formatFromBigInt({ value: 1n, scale: 5 })).toBe("0.00001");
      });

      test("pads with leading zeros and preserves trailing zeros", () => {
         expect(
            formatFromBigInt({ value: 1n, scale: 5, trimTrailingZeros: false }),
         ).toBe("0.00001");
      });

      test("handles large scale", () => {
         expect(formatFromBigInt({ value: 12300000000n, scale: 10 })).toBe(
            "1.23",
         );
      });

      test("handles very small values", () => {
         expect(formatFromBigInt({ value: 1n, scale: 10 })).toBe(
            "0.0000000001",
         );
      });

      test("formats value exactly matching scale", () => {
         expect(formatFromBigInt({ value: 12345n, scale: 4 })).toBe("1.2345");
      });
   });

   describe("edge cases", () => {
      test("handles very large numbers", () => {
         expect(
            formatFromBigInt({ value: 99999999999999999999n, scale: 2 }),
         ).toBe("999999999999999999.99");
      });

      test("handles negative zero as zero", () => {
         expect(formatFromBigInt({ value: -0n, scale: 2 })).toBe("0");
      });

      test("handles single digit with scale", () => {
         expect(formatFromBigInt({ value: 5n, scale: 1 })).toBe("0.5");
      });

      test("handles negative single digit with scale", () => {
         expect(formatFromBigInt({ value: -5n, scale: 1 })).toBe("-0.5");
      });

      test("handles zero with large scale", () => {
         expect(formatFromBigInt({ value: 0n, scale: 10 })).toBe("0");
      });

      test("handles zero with trimTrailingZeros false", () => {
         expect(
            formatFromBigInt({ value: 0n, scale: 2, trimTrailingZeros: false }),
         ).toBe("0.00");
      });
   });

   describe("validation errors", () => {
      test("throws on negative scale", () => {
         expect(() => formatFromBigInt({ value: 123n, scale: -1 })).toThrow();
      });

      test("throws on non-integer scale", () => {
         expect(() => formatFromBigInt({ value: 123n, scale: 1.5 })).toThrow();
      });

      test("throws on non-bigint value", () => {
         // @ts-expect-error - testing runtime validation
         expect(() => formatFromBigInt({ value: "123", scale: 2 })).toThrow();
      });
   });
});
