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
