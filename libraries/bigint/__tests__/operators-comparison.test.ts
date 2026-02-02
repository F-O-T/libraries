import { describe, expect, test } from "bun:test";
import {
  bigintEqualsOperator,
  bigintNotEqualsOperator,
  bigintGreaterThanOperator,
  bigintGreaterThanOrEqualOperator,
  bigintLessThanOperator,
  bigintLessThanOrEqualOperator,
} from "../src/plugins/operators/comparison";

describe("bigintEqualsOperator", () => {
  test("returns true when values are equal", () => {
    const actual = { value: 100n, scale: 2 };
    const expected = { value: 100n, scale: 2 };
    expect(bigintEqualsOperator.evaluate(actual, expected)).toBe(true);
  });

  test("returns false when values differ", () => {
    const actual = { value: 100n, scale: 2 };
    const expected = { value: 50n, scale: 2 };
    expect(bigintEqualsOperator.evaluate(actual, expected)).toBe(false);
  });

  test("throws on scale mismatch", () => {
    const actual = { value: 100n, scale: 2 };
    const expected = { value: 100n, scale: 4 };
    expect(() => bigintEqualsOperator.evaluate(actual, expected)).toThrow();
  });

  test("validates input schema", () => {
    expect(() => bigintEqualsOperator.evaluate("invalid", { value: 100n, scale: 2 })).toThrow();
  });

  test("handles negative values", () => {
    const actual = { value: -100n, scale: 2 };
    const expected = { value: -100n, scale: 2 };
    expect(bigintEqualsOperator.evaluate(actual, expected)).toBe(true);

    const different1 = { value: -100n, scale: 2 };
    const different2 = { value: -50n, scale: 2 };
    expect(bigintEqualsOperator.evaluate(different1, different2)).toBe(false);
  });

  test("handles zero values", () => {
    const actual = { value: 0n, scale: 2 };
    const expected = { value: 0n, scale: 2 };
    expect(bigintEqualsOperator.evaluate(actual, expected)).toBe(true);

    const nonZero = { value: 100n, scale: 2 };
    expect(bigintEqualsOperator.evaluate(actual, nonZero)).toBe(false);
  });

  test("handles mixed signs", () => {
    const negative = { value: -50n, scale: 2 };
    const positive = { value: 50n, scale: 2 };
    expect(bigintEqualsOperator.evaluate(negative, positive)).toBe(false);
  });
});

describe("bigintNotEqualsOperator", () => {
  test("returns true when values differ", () => {
    const actual = { value: 100n, scale: 2 };
    const expected = { value: 50n, scale: 2 };
    expect(bigintNotEqualsOperator.evaluate(actual, expected)).toBe(true);
  });

  test("returns false when values are equal", () => {
    const actual = { value: 100n, scale: 2 };
    const expected = { value: 100n, scale: 2 };
    expect(bigintNotEqualsOperator.evaluate(actual, expected)).toBe(false);
  });
});

describe("bigintGreaterThanOperator", () => {
  test("returns true when actual > expected", () => {
    const actual = { value: 100n, scale: 2 };
    const expected = { value: 50n, scale: 2 };
    expect(bigintGreaterThanOperator.evaluate(actual, expected)).toBe(true);
  });

  test("returns false when actual <= expected", () => {
    const actual = { value: 50n, scale: 2 };
    const expected = { value: 100n, scale: 2 };
    expect(bigintGreaterThanOperator.evaluate(actual, expected)).toBe(false);

    const equal1 = { value: 100n, scale: 2 };
    const equal2 = { value: 100n, scale: 2 };
    expect(bigintGreaterThanOperator.evaluate(equal1, equal2)).toBe(false);
  });

  test("handles negative values", () => {
    // -50 > -100 should be true
    const actual = { value: -50n, scale: 2 };
    const expected = { value: -100n, scale: 2 };
    expect(bigintGreaterThanOperator.evaluate(actual, expected)).toBe(true);

    // -100 > -50 should be false
    const actual2 = { value: -100n, scale: 2 };
    const expected2 = { value: -50n, scale: 2 };
    expect(bigintGreaterThanOperator.evaluate(actual2, expected2)).toBe(false);
  });

  test("handles zero values", () => {
    const zero = { value: 0n, scale: 2 };
    const positive = { value: 100n, scale: 2 };
    expect(bigintGreaterThanOperator.evaluate(positive, zero)).toBe(true);
    expect(bigintGreaterThanOperator.evaluate(zero, positive)).toBe(false);
  });

  test("handles mixed signs", () => {
    const positive = { value: 50n, scale: 2 };
    const negative = { value: -50n, scale: 2 };
    expect(bigintGreaterThanOperator.evaluate(positive, negative)).toBe(true);
    expect(bigintGreaterThanOperator.evaluate(negative, positive)).toBe(false);
  });
});

describe("bigintGreaterThanOrEqualOperator", () => {
  test("returns true when actual >= expected", () => {
    const actual1 = { value: 100n, scale: 2 };
    const expected1 = { value: 50n, scale: 2 };
    expect(bigintGreaterThanOrEqualOperator.evaluate(actual1, expected1)).toBe(true);

    const actual2 = { value: 100n, scale: 2 };
    const expected2 = { value: 100n, scale: 2 };
    expect(bigintGreaterThanOrEqualOperator.evaluate(actual2, expected2)).toBe(true);
  });

  test("returns false when actual < expected", () => {
    const actual = { value: 50n, scale: 2 };
    const expected = { value: 100n, scale: 2 };
    expect(bigintGreaterThanOrEqualOperator.evaluate(actual, expected)).toBe(false);
  });
});

describe("bigintLessThanOperator", () => {
  test("returns true when actual < expected", () => {
    const actual = { value: 50n, scale: 2 };
    const expected = { value: 100n, scale: 2 };
    expect(bigintLessThanOperator.evaluate(actual, expected)).toBe(true);
  });

  test("returns false when actual >= expected", () => {
    const actual = { value: 100n, scale: 2 };
    const expected = { value: 50n, scale: 2 };
    expect(bigintLessThanOperator.evaluate(actual, expected)).toBe(false);

    const equal1 = { value: 100n, scale: 2 };
    const equal2 = { value: 100n, scale: 2 };
    expect(bigintLessThanOperator.evaluate(equal1, equal2)).toBe(false);
  });

  test("handles negative values", () => {
    // -100 < -50 should be true
    const actual = { value: -100n, scale: 2 };
    const expected = { value: -50n, scale: 2 };
    expect(bigintLessThanOperator.evaluate(actual, expected)).toBe(true);

    // -50 < -100 should be false
    const actual2 = { value: -50n, scale: 2 };
    const expected2 = { value: -100n, scale: 2 };
    expect(bigintLessThanOperator.evaluate(actual2, expected2)).toBe(false);
  });

  test("handles zero values", () => {
    const zero = { value: 0n, scale: 2 };
    const positive = { value: 100n, scale: 2 };
    expect(bigintLessThanOperator.evaluate(zero, positive)).toBe(true);
    expect(bigintLessThanOperator.evaluate(positive, zero)).toBe(false);
  });

  test("handles mixed signs", () => {
    const negative = { value: -50n, scale: 2 };
    const positive = { value: 50n, scale: 2 };
    expect(bigintLessThanOperator.evaluate(negative, positive)).toBe(true);
    expect(bigintLessThanOperator.evaluate(positive, negative)).toBe(false);
  });
});

describe("bigintLessThanOrEqualOperator", () => {
  test("returns true when actual <= expected", () => {
    const actual1 = { value: 50n, scale: 2 };
    const expected1 = { value: 100n, scale: 2 };
    expect(bigintLessThanOrEqualOperator.evaluate(actual1, expected1)).toBe(true);

    const actual2 = { value: 100n, scale: 2 };
    const expected2 = { value: 100n, scale: 2 };
    expect(bigintLessThanOrEqualOperator.evaluate(actual2, expected2)).toBe(true);
  });

  test("returns false when actual > expected", () => {
    const actual = { value: 100n, scale: 2 };
    const expected = { value: 50n, scale: 2 };
    expect(bigintLessThanOrEqualOperator.evaluate(actual, expected)).toBe(false);
  });
});
