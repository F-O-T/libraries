import { describe, expect, test } from "bun:test";
import { parseToBigInt } from "../src/parse";

describe("parseToBigInt", () => {
   describe("basic parsing", () => {
      test("parses positive decimal string", () => {
         expect(parseToBigInt({ value: "123.45", scale: 2 })).toBe(12345n);
      });

      test("parses negative decimal string", () => {
         expect(parseToBigInt({ value: "-123.45", scale: 2 })).toBe(-12345n);
      });

      test("parses integer string", () => {
         expect(parseToBigInt({ value: "100", scale: 2 })).toBe(10000n);
      });

      test("parses zero", () => {
         expect(parseToBigInt({ value: "0", scale: 2 })).toBe(0n);
      });

      test("parses positive number", () => {
         expect(parseToBigInt({ value: 123.45, scale: 2 })).toBe(12345n);
      });

      test("parses negative number", () => {
         expect(parseToBigInt({ value: -123.45, scale: 2 })).toBe(-12345n);
      });
   });

   describe("scale handling", () => {
      test("pads with zeros when input has fewer decimals than scale", () => {
         expect(parseToBigInt({ value: "123.4", scale: 3 })).toBe(123400n);
      });

      test("handles scale 0 (integers)", () => {
         expect(
            parseToBigInt({
               value: "123.45",
               scale: 0,
               roundingMode: "truncate",
            }),
         ).toBe(123n);
      });

      test("handles large scale", () => {
         expect(parseToBigInt({ value: "1.23", scale: 10 })).toBe(12300000000n);
      });

      test("pads integer input with zeros", () => {
         expect(parseToBigInt({ value: "100", scale: 4 })).toBe(1000000n);
      });
   });

   describe("rounding modes - truncate", () => {
      test("truncates excess decimals (positive)", () => {
         expect(
            parseToBigInt({
               value: "123.456",
               scale: 2,
               roundingMode: "truncate",
            }),
         ).toBe(12345n);
      });

      test("truncates excess decimals (negative)", () => {
         expect(
            parseToBigInt({
               value: "-123.456",
               scale: 2,
               roundingMode: "truncate",
            }),
         ).toBe(-12345n);
      });

      test("defaults to truncate when no rounding mode specified", () => {
         expect(parseToBigInt({ value: "123.456", scale: 2 })).toBe(12345n);
      });
   });

   describe("rounding modes - round (banker's rounding)", () => {
      test("rounds half to even (positive, tie to even)", () => {
         expect(
            parseToBigInt({ value: "12.5", scale: 0, roundingMode: "round" }),
         ).toBe(12n);
      });

      test("rounds half to even (positive, tie to odd)", () => {
         expect(
            parseToBigInt({ value: "13.5", scale: 0, roundingMode: "round" }),
         ).toBe(14n);
      });

      test("rounds half to even (negative, tie to even)", () => {
         expect(
            parseToBigInt({ value: "-12.5", scale: 0, roundingMode: "round" }),
         ).toBe(-12n);
      });

      test("rounds half to even (negative, tie to odd)", () => {
         expect(
            parseToBigInt({ value: "-13.5", scale: 0, roundingMode: "round" }),
         ).toBe(-14n);
      });

      test("rounds up when > 0.5", () => {
         expect(
            parseToBigInt({ value: "12.6", scale: 0, roundingMode: "round" }),
         ).toBe(13n);
      });

      test("rounds down when < 0.5", () => {
         expect(
            parseToBigInt({ value: "12.4", scale: 0, roundingMode: "round" }),
         ).toBe(12n);
      });
   });

   describe("rounding modes - ceil", () => {
      test("rounds up (positive)", () => {
         expect(
            parseToBigInt({ value: "123.001", scale: 2, roundingMode: "ceil" }),
         ).toBe(12301n);
      });

      test("rounds toward zero (negative)", () => {
         expect(
            parseToBigInt({
               value: "-123.001",
               scale: 2,
               roundingMode: "ceil",
            }),
         ).toBe(-12300n);
      });

      test("no rounding when exact", () => {
         expect(
            parseToBigInt({ value: "123.45", scale: 2, roundingMode: "ceil" }),
         ).toBe(12345n);
      });
   });

   describe("rounding modes - floor", () => {
      test("rounds down (positive)", () => {
         expect(
            parseToBigInt({
               value: "123.999",
               scale: 2,
               roundingMode: "floor",
            }),
         ).toBe(12399n);
      });

      test("rounds away from zero (negative)", () => {
         expect(
            parseToBigInt({
               value: "-123.001",
               scale: 2,
               roundingMode: "floor",
            }),
         ).toBe(-12301n);
      });

      test("no rounding when exact", () => {
         expect(
            parseToBigInt({ value: "123.45", scale: 2, roundingMode: "floor" }),
         ).toBe(12345n);
      });
   });

   describe("edge cases", () => {
      test("handles very large numbers", () => {
         expect(
            parseToBigInt({ value: "999999999999999999.99", scale: 2 }),
         ).toBe(99999999999999999999n);
      });

      test("handles very small decimals", () => {
         expect(parseToBigInt({ value: "0.00001", scale: 5 })).toBe(1n);
      });

      test("handles zero with scale", () => {
         expect(parseToBigInt({ value: "0.00", scale: 2 })).toBe(0n);
      });

      test("handles negative zero", () => {
         expect(parseToBigInt({ value: "-0", scale: 2 })).toBe(0n);
      });
   });

   describe("validation errors", () => {
      test("throws on invalid string format", () => {
         expect(() => parseToBigInt({ value: "abc", scale: 2 })).toThrow();
      });

      test("throws on negative scale", () => {
         expect(() => parseToBigInt({ value: "123.45", scale: -1 })).toThrow();
      });

      test("throws on non-finite number", () => {
         expect(() =>
            parseToBigInt({ value: Number.POSITIVE_INFINITY, scale: 2 }),
         ).toThrow();
      });

      test("throws on NaN", () => {
         expect(() => parseToBigInt({ value: Number.NaN, scale: 2 })).toThrow();
      });
   });
});
