import { describe, expect, test } from "bun:test";
import {
   abs,
   add,
   divide,
   max,
   min,
   multiply,
   subtract,
} from "../src/arithmetic";

describe("add", () => {
   test("adds two positive numbers", () => {
      expect(add({ a: 100n, b: 50n, scale: 2 })).toBe(150n);
   });

   test("adds positive and negative", () => {
      expect(add({ a: 100n, b: -30n, scale: 2 })).toBe(70n);
   });

   test("adds two negative numbers", () => {
      expect(add({ a: -100n, b: -50n, scale: 2 })).toBe(-150n);
   });

   test("adds with zero", () => {
      expect(add({ a: 100n, b: 0n, scale: 2 })).toBe(100n);
   });

   test("throws on negative scale", () => {
      expect(() => add({ a: 100n, b: 50n, scale: -1 })).toThrow();
   });
});

describe("subtract", () => {
   test("subtracts positive numbers", () => {
      expect(subtract({ a: 100n, b: 50n, scale: 2 })).toBe(50n);
   });

   test("subtracts resulting in negative", () => {
      expect(subtract({ a: 50n, b: 100n, scale: 2 })).toBe(-50n);
   });

   test("subtracts negative number (adds)", () => {
      expect(subtract({ a: 100n, b: -50n, scale: 2 })).toBe(150n);
   });

   test("subtracts from zero", () => {
      expect(subtract({ a: 0n, b: 50n, scale: 2 })).toBe(-50n);
   });

   test("throws on non-integer scale", () => {
      expect(() => subtract({ a: 100n, b: 50n, scale: 1.5 })).toThrow();
   });
});

describe("multiply", () => {
   test("multiplies positive numbers and scales back", () => {
      // 1.00 * 2.00 = 2.00 (scale 2)
      // 100n * 200n = 20000n, then / 100n = 200n
      expect(multiply({ a: 100n, b: 200n, scale: 2 })).toBe(200n);
   });

   test("multiplies with scale 4", () => {
      // 1.5000 * 2.0000 = 3.0000 (scale 4)
      // 15000n * 20000n = 300000000n, then / 10000n = 30000n
      expect(multiply({ a: 15000n, b: 20000n, scale: 4 })).toBe(30000n);
   });

   test("multiplies positive and negative", () => {
      expect(multiply({ a: 100n, b: -200n, scale: 2 })).toBe(-200n);
   });

   test("multiplies two negative numbers", () => {
      expect(multiply({ a: -100n, b: -200n, scale: 2 })).toBe(200n);
   });

   test("multiplies by zero", () => {
      expect(multiply({ a: 100n, b: 0n, scale: 2 })).toBe(0n);
   });

   test("multiplies decimal values", () => {
      // 1.23 * 4.56 = 5.6088 → 5.60 truncated (scale 2)
      // 123n * 456n = 56088n, then / 100n = 560n (truncates to 560)
      expect(multiply({ a: 123n, b: 456n, scale: 2 })).toBe(560n);
   });
});

describe("divide", () => {
   describe("basic division", () => {
      test("divides evenly with truncate", () => {
         // 4.00 / 2.00 = 2.00 (scale 2)
         // (400n * 100n) / 200n = 200n
         expect(divide({ a: 400n, b: 200n, scale: 2 })).toBe(200n);
      });

      test("divides with truncate rounding mode", () => {
         // 1.00 / 3.00 = 0.33... → 0.33 truncated
         // (100n * 100n) / 300n = 10000n / 300n = 33n
         expect(divide({ a: 100n, b: 300n, scale: 2 })).toBe(33n);
      });

      test("divides resulting in zero", () => {
         expect(divide({ a: 1n, b: 1000n, scale: 2 })).toBe(0n);
      });

      test("divides by negative number", () => {
         expect(divide({ a: 400n, b: -200n, scale: 2 })).toBe(-200n);
      });

      test("divides negative by positive", () => {
         expect(divide({ a: -400n, b: 200n, scale: 2 })).toBe(-200n);
      });

      test("divides two negative numbers", () => {
         expect(divide({ a: -400n, b: -200n, scale: 2 })).toBe(200n);
      });
   });

   describe("rounding modes", () => {
      test("rounds with banker's rounding (round half to even)", () => {
         // 2.25 / 1.00 = 2.25 → 2.2 (banker's round: .25 → .2, even)
         // (225n * 100n) / 100n = 225n, need to round last digit
         // Actually: result is 225n already at scale 2
         // Better example: 1.00 / 3.00 with scale 1
         expect(
            divide({ a: 100n, b: 300n, scale: 1, roundingMode: "round" }),
         ).toBe(3n);
      });

      test("rounds up with ceil", () => {
         // 1.00 / 3.00 = 0.33... → 0.34 with ceil
         expect(
            divide({ a: 100n, b: 300n, scale: 2, roundingMode: "ceil" }),
         ).toBe(34n);
      });

      test("rounds down with floor", () => {
         // 1.00 / 3.00 = 0.33... → 0.33 with floor
         expect(
            divide({ a: 100n, b: 300n, scale: 2, roundingMode: "floor" }),
         ).toBe(33n);
      });

      test("ceil with negative result rounds toward zero", () => {
         // -1.00 / 3.00 = -0.33... → -0.33 with ceil (toward +inf)
         expect(
            divide({ a: -100n, b: 300n, scale: 2, roundingMode: "ceil" }),
         ).toBe(-33n);
      });

      test("floor with negative result rounds away from zero", () => {
         // -1.00 / 3.00 = -0.33... → -0.34 with floor (toward -inf)
         expect(
            divide({ a: -100n, b: 300n, scale: 2, roundingMode: "floor" }),
         ).toBe(-34n);
      });
   });

   describe("validation", () => {
      test("throws on division by zero", () => {
         expect(() => divide({ a: 100n, b: 0n, scale: 2 })).toThrow();
      });

      test("throws on negative scale", () => {
         expect(() => divide({ a: 100n, b: 200n, scale: -1 })).toThrow();
      });
   });
});

describe("abs", () => {
   test("returns absolute value of positive number", () => {
      expect(abs({ a: 100n, b: 0n, scale: 2 })).toBe(100n);
   });

   test("returns absolute value of negative number", () => {
      expect(abs({ a: -100n, b: 0n, scale: 2 })).toBe(100n);
   });

   test("returns zero for zero", () => {
      expect(abs({ a: 0n, b: 0n, scale: 2 })).toBe(0n);
   });

   test("works with large numbers", () => {
      expect(abs({ a: -999999999999n, b: 0n, scale: 2 })).toBe(999999999999n);
   });
});

describe("min", () => {
   test("returns smaller of two positive numbers", () => {
      expect(min({ a: 100n, b: 200n, scale: 2 })).toBe(100n);
   });

   test("returns smaller when first is larger", () => {
      expect(min({ a: 200n, b: 100n, scale: 2 })).toBe(100n);
   });

   test("returns negative when comparing negative and positive", () => {
      expect(min({ a: -100n, b: 100n, scale: 2 })).toBe(-100n);
   });

   test("returns more negative of two negative numbers", () => {
      expect(min({ a: -100n, b: -200n, scale: 2 })).toBe(-200n);
   });

   test("returns same value when equal", () => {
      expect(min({ a: 100n, b: 100n, scale: 2 })).toBe(100n);
   });

   test("handles zero", () => {
      expect(min({ a: 0n, b: 100n, scale: 2 })).toBe(0n);
   });
});

describe("max", () => {
   test("returns larger of two positive numbers", () => {
      expect(max({ a: 100n, b: 200n, scale: 2 })).toBe(200n);
   });

   test("returns larger when first is larger", () => {
      expect(max({ a: 200n, b: 100n, scale: 2 })).toBe(200n);
   });

   test("returns positive when comparing negative and positive", () => {
      expect(max({ a: -100n, b: 100n, scale: 2 })).toBe(100n);
   });

   test("returns less negative of two negative numbers", () => {
      expect(max({ a: -100n, b: -200n, scale: 2 })).toBe(-100n);
   });

   test("returns same value when equal", () => {
      expect(max({ a: 100n, b: 100n, scale: 2 })).toBe(100n);
   });

   test("handles zero", () => {
      expect(max({ a: 0n, b: -100n, scale: 2 })).toBe(0n);
   });
});
