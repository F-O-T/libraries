import { describe, expect, test } from "bun:test";
import {
   ArithmeticInputSchema,
   ConvertScaleInputSchema,
   DecimalStringSchema,
   DivideInputSchema,
   FormatInputSchema,
   ParseInputSchema,
   RoundingModeSchema,
   ScaledBigIntSchema,
   ScaleSchema,
} from "../src/schemas";

describe("RoundingModeSchema", () => {
   test("accepts valid rounding modes", () => {
      expect(RoundingModeSchema.parse("truncate")).toBe("truncate");
      expect(RoundingModeSchema.parse("round")).toBe("round");
      expect(RoundingModeSchema.parse("ceil")).toBe("ceil");
      expect(RoundingModeSchema.parse("floor")).toBe("floor");
   });

   test("rejects invalid rounding modes", () => {
      expect(() => RoundingModeSchema.parse("invalid")).toThrow();
   });
});

describe("ScaleSchema", () => {
   test("accepts non-negative integers", () => {
      expect(ScaleSchema.parse(0)).toBe(0);
      expect(ScaleSchema.parse(2)).toBe(2);
      expect(ScaleSchema.parse(12)).toBe(12);
   });

   test("rejects negative numbers", () => {
      expect(() => ScaleSchema.parse(-1)).toThrow();
   });

   test("rejects decimals", () => {
      expect(() => ScaleSchema.parse(1.5)).toThrow();
   });
});

describe("DecimalStringSchema", () => {
   test("accepts valid decimal strings", () => {
      expect(DecimalStringSchema.parse("123.45")).toBe("123.45");
      expect(DecimalStringSchema.parse("0.1")).toBe("0.1");
      expect(DecimalStringSchema.parse("-50.5")).toBe("-50.5");
      expect(DecimalStringSchema.parse("100")).toBe("100");
   });

   test("rejects invalid formats", () => {
      expect(() => DecimalStringSchema.parse("abc")).toThrow();
      expect(() => DecimalStringSchema.parse("12.34.56")).toThrow();
      expect(() => DecimalStringSchema.parse("")).toThrow();
   });
});

describe("ParseInputSchema", () => {
   test("accepts valid parse input", () => {
      const result = ParseInputSchema.parse({
         value: "10.5",
         scale: 2,
         roundingMode: "truncate",
      });
      expect(result.value).toBe("10.5");
      expect(result.scale).toBe(2);
      expect(result.roundingMode).toBe("truncate");
   });

   test("accepts number values", () => {
      const result = ParseInputSchema.parse({ value: 10.5, scale: 2 });
      expect(result.value).toBe(10.5);
   });

   test("rejects invalid input", () => {
      expect(() =>
         ParseInputSchema.parse({ value: "abc", scale: 2 }),
      ).toThrow();
   });
});

describe("ArithmeticInputSchema", () => {
   test("accepts valid arithmetic input", () => {
      const result = ArithmeticInputSchema.parse({
         a: 100n,
         b: 50n,
         scale: 2,
      });
      expect(result.a).toBe(100n);
      expect(result.b).toBe(50n);
      expect(result.scale).toBe(2);
   });

   test("rejects negative scale", () => {
      expect(() =>
         ArithmeticInputSchema.parse({ a: 100n, b: 50n, scale: -1 }),
      ).toThrow();
   });
});

describe("DivideInputSchema", () => {
   test("accepts valid division input", () => {
      const result = DivideInputSchema.parse({
         a: 100n,
         b: 3n,
         scale: 2,
         roundingMode: "round",
      });
      expect(result.a).toBe(100n);
      expect(result.b).toBe(3n);
   });

   test("rejects division by zero", () => {
      expect(() =>
         DivideInputSchema.parse({ a: 100n, b: 0n, scale: 2 }),
      ).toThrow();
   });
});

describe("ConvertScaleInputSchema", () => {
   test("accepts valid scale conversion input", () => {
      const result = ConvertScaleInputSchema.parse({
         value: 100n,
         fromScale: 2,
         toScale: 4,
         roundingMode: "round",
      });
      expect(result.value).toBe(100n);
      expect(result.fromScale).toBe(2);
      expect(result.toScale).toBe(4);
   });
});

describe("FormatInputSchema", () => {
   test("accepts valid format input", () => {
      const result = FormatInputSchema.parse({
         value: 100n,
         scale: 2,
         trimTrailingZeros: true,
      });
      expect(result.trimTrailingZeros).toBe(true);
   });

   test("defaults trimTrailingZeros to true", () => {
      const result = FormatInputSchema.parse({ value: 100n, scale: 2 });
      expect(result.trimTrailingZeros).toBe(true);
   });
});

describe("ScaledBigIntSchema", () => {
   test("accepts valid scaled bigint", () => {
      const result = ScaledBigIntSchema.parse({ value: 100n, scale: 2 });
      expect(result.value).toBe(100n);
      expect(result.scale).toBe(2);
   });
});
