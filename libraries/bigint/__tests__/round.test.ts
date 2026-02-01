import { describe, test, expect } from "bun:test";
import { bankersRound, roundUp, roundDown, convertScale } from "../src/round";

describe("bankersRound", () => {
  describe("positive values", () => {
    test("rounds down when below halfway", () => {
      expect(bankersRound(14n, 10n)).toBe(1n);
      expect(bankersRound(24n, 10n)).toBe(2n);
    });

    test("rounds up when above halfway", () => {
      expect(bankersRound(16n, 10n)).toBe(2n);
      expect(bankersRound(26n, 10n)).toBe(3n);
    });

    test("rounds to even when exactly halfway", () => {
      expect(bankersRound(15n, 10n)).toBe(2n); // 1.5 → 2 (even)
      expect(bankersRound(25n, 10n)).toBe(2n); // 2.5 → 2 (even)
      expect(bankersRound(35n, 10n)).toBe(4n); // 3.5 → 4 (even)
      expect(bankersRound(45n, 10n)).toBe(4n); // 4.5 → 4 (even)
    });

    test("handles exact divisions", () => {
      expect(bankersRound(20n, 10n)).toBe(2n);
      expect(bankersRound(100n, 10n)).toBe(10n);
    });
  });

  describe("negative values", () => {
    test("rounds toward zero when below halfway (magnitude)", () => {
      expect(bankersRound(-14n, 10n)).toBe(-1n);
      expect(bankersRound(-24n, 10n)).toBe(-2n);
    });

    test("rounds away from zero when above halfway (magnitude)", () => {
      expect(bankersRound(-16n, 10n)).toBe(-2n);
      expect(bankersRound(-26n, 10n)).toBe(-3n);
    });

    test("rounds to even when exactly halfway", () => {
      expect(bankersRound(-15n, 10n)).toBe(-2n); // -1.5 → -2 (even)
      expect(bankersRound(-25n, 10n)).toBe(-2n); // -2.5 → -2 (even)
      expect(bankersRound(-35n, 10n)).toBe(-4n); // -3.5 → -4 (even)
      expect(bankersRound(-45n, 10n)).toBe(-4n); // -4.5 → -4 (even)
    });

    test("handles exact divisions", () => {
      expect(bankersRound(-20n, 10n)).toBe(-2n);
      expect(bankersRound(-100n, 10n)).toBe(-10n);
    });
  });

  describe("edge cases", () => {
    test("throws on division by zero", () => {
      expect(() => bankersRound(10n, 0n)).toThrow("Division by zero");
    });

    test("handles zero value", () => {
      expect(bankersRound(0n, 10n)).toBe(0n);
    });

    test("handles large divisors", () => {
      expect(bankersRound(123n, 1000n)).toBe(0n);
      expect(bankersRound(500n, 1000n)).toBe(0n); // exactly 0.5 → 0 (even)
      expect(bankersRound(1500n, 1000n)).toBe(2n); // exactly 1.5 → 2 (even)
    });
  });
});

describe("roundUp", () => {
  describe("positive values", () => {
    test("rounds up (ceiling) for positive remainders", () => {
      expect(roundUp(11n, 10n)).toBe(2n);
      expect(roundUp(19n, 10n)).toBe(2n);
      expect(roundUp(21n, 10n)).toBe(3n);
    });

    test("no rounding for exact divisions", () => {
      expect(roundUp(20n, 10n)).toBe(2n);
      expect(roundUp(100n, 10n)).toBe(10n);
    });
  });

  describe("negative values", () => {
    test("rounds toward zero (ceiling) for negative values", () => {
      expect(roundUp(-11n, 10n)).toBe(-1n); // ceiling of -1.1
      expect(roundUp(-19n, 10n)).toBe(-1n); // ceiling of -1.9
      expect(roundUp(-21n, 10n)).toBe(-2n); // ceiling of -2.1
    });

    test("no rounding for exact divisions", () => {
      expect(roundUp(-20n, 10n)).toBe(-2n);
      expect(roundUp(-100n, 10n)).toBe(-10n);
    });
  });

  describe("edge cases", () => {
    test("throws on division by zero", () => {
      expect(() => roundUp(10n, 0n)).toThrow("Division by zero");
    });

    test("handles zero value", () => {
      expect(roundUp(0n, 10n)).toBe(0n);
    });
  });
});

describe("roundDown", () => {
  describe("positive values", () => {
    test("rounds down (floor) for positive remainders", () => {
      expect(roundDown(11n, 10n)).toBe(1n);
      expect(roundDown(19n, 10n)).toBe(1n);
      expect(roundDown(21n, 10n)).toBe(2n);
    });

    test("no rounding for exact divisions", () => {
      expect(roundDown(20n, 10n)).toBe(2n);
      expect(roundDown(100n, 10n)).toBe(10n);
    });
  });

  describe("negative values", () => {
    test("rounds away from zero (floor) for negative values", () => {
      expect(roundDown(-11n, 10n)).toBe(-2n); // floor of -1.1
      expect(roundDown(-19n, 10n)).toBe(-2n); // floor of -1.9
      expect(roundDown(-21n, 10n)).toBe(-3n); // floor of -2.1
    });

    test("no rounding for exact divisions", () => {
      expect(roundDown(-20n, 10n)).toBe(-2n);
      expect(roundDown(-100n, 10n)).toBe(-10n);
    });
  });

  describe("edge cases", () => {
    test("throws on division by zero", () => {
      expect(() => roundDown(10n, 0n)).toThrow("Division by zero");
    });

    test("handles zero value", () => {
      expect(roundDown(0n, 10n)).toBe(0n);
    });
  });
});

describe("convertScale", () => {
  describe("scaling up (increasing precision)", () => {
    test("multiplies by power of 10", () => {
      expect(convertScale({ value: 123n, fromScale: 2, toScale: 4 })).toBe(12300n);
      expect(convertScale({ value: 500n, fromScale: 1, toScale: 3 })).toBe(50000n);
    });

    test("handles zero scale to positive scale", () => {
      expect(convertScale({ value: 42n, fromScale: 0, toScale: 2 })).toBe(4200n);
    });

    test("handles negative values", () => {
      expect(convertScale({ value: -123n, fromScale: 2, toScale: 4 })).toBe(-12300n);
    });
  });

  describe("scaling down (decreasing precision)", () => {
    test("truncates by default", () => {
      expect(convertScale({ value: 12345n, fromScale: 4, toScale: 2 })).toBe(123n);
      expect(convertScale({ value: 12399n, fromScale: 4, toScale: 2 })).toBe(123n);
    });

    test("rounds with banker's rounding when mode is 'round'", () => {
      expect(convertScale({
        value: 12345n,
        fromScale: 4,
        toScale: 2,
        roundingMode: "round",
      })).toBe(123n);
      expect(convertScale({
        value: 12350n,
        fromScale: 4,
        toScale: 2,
        roundingMode: "round",
      })).toBe(124n); // 123.50 → 124 (even)
      expect(convertScale({
        value: 12450n,
        fromScale: 4,
        toScale: 2,
        roundingMode: "round",
      })).toBe(124n); // 124.50 → 124 (even)
    });

    test("rounds up when mode is 'ceil'", () => {
      expect(convertScale({
        value: 12301n,
        fromScale: 4,
        toScale: 2,
        roundingMode: "ceil",
      })).toBe(124n);
      expect(convertScale({
        value: -12301n,
        fromScale: 4,
        toScale: 2,
        roundingMode: "ceil",
      })).toBe(-123n);
    });

    test("rounds down when mode is 'floor'", () => {
      expect(convertScale({
        value: 12399n,
        fromScale: 4,
        toScale: 2,
        roundingMode: "floor",
      })).toBe(123n);
      expect(convertScale({
        value: -12301n,
        fromScale: 4,
        toScale: 2,
        roundingMode: "floor",
      })).toBe(-124n);
    });

    test("handles negative values with different rounding modes", () => {
      expect(convertScale({
        value: -12345n,
        fromScale: 4,
        toScale: 2,
        roundingMode: "truncate",
      })).toBe(-123n);
      expect(convertScale({
        value: -12345n,
        fromScale: 4,
        toScale: 2,
        roundingMode: "round",
      })).toBe(-123n);
    });
  });

  describe("same scale (no-op)", () => {
    test("returns value unchanged", () => {
      expect(convertScale({ value: 12345n, fromScale: 4, toScale: 4 })).toBe(12345n);
      expect(convertScale({ value: -999n, fromScale: 2, toScale: 2 })).toBe(-999n);
    });
  });

  describe("validation", () => {
    test("validates input with Zod schema", () => {
      expect(() => convertScale({
        value: 123n,
        fromScale: -1,
        toScale: 2,
      })).toThrow();
      expect(() => convertScale({
        value: 123n,
        fromScale: 2,
        toScale: -1,
      })).toThrow();
    });
  });

  describe("edge cases", () => {
    test("handles zero value", () => {
      expect(convertScale({ value: 0n, fromScale: 2, toScale: 4 })).toBe(0n);
      expect(convertScale({ value: 0n, fromScale: 4, toScale: 2 })).toBe(0n);
    });

    test("handles large scale differences", () => {
      expect(convertScale({ value: 1n, fromScale: 0, toScale: 10 })).toBe(10000000000n);
      expect(convertScale({
        value: 10000000000n,
        fromScale: 10,
        toScale: 0,
        roundingMode: "truncate",
      })).toBe(1n);
    });
  });
});
