import { createOperator } from "@f-o-t/condition-evaluator";
import { compare, equals } from "../../compare";
import { ScaledBigIntSchema, type ScaledBigInt } from "../../schemas";

/**
 * Helper to validate and extract scaled bigint
 */
function toScaledBigInt(value: unknown): ScaledBigInt {
  return ScaledBigIntSchema.parse(value);
}

/**
 * Validate that two scaled bigints have the same scale
 */
function assertSameScale(a: ScaledBigInt, b: ScaledBigInt): void {
  if (a.scale !== b.scale) {
    throw new Error(
      `Scale mismatch: ${a.scale} !== ${b.scale}. Values must have the same scale for comparison.`
    );
  }
}

/**
 * BigInt equals operator
 */
export const bigintEqualsOperator = createOperator({
  name: "bigint_eq",
  type: "custom",
  description: "Check if two scaled bigint values are equal",
  evaluate: (actual: unknown, expected: unknown): boolean => {
    const a = toScaledBigInt(actual);
    const b = toScaledBigInt(expected);
    assertSameScale(a, b);
    return equals({ a: a.value, b: b.value, scale: a.scale });
  },
  valueSchema: ScaledBigIntSchema,
});

/**
 * BigInt not equals operator
 */
export const bigintNotEqualsOperator = createOperator({
  name: "bigint_neq",
  type: "custom",
  description: "Check if two scaled bigint values are not equal",
  evaluate: (actual: unknown, expected: unknown): boolean => {
    const a = toScaledBigInt(actual);
    const b = toScaledBigInt(expected);
    assertSameScale(a, b);
    return !equals({ a: a.value, b: b.value, scale: a.scale });
  },
  valueSchema: ScaledBigIntSchema,
});

/**
 * BigInt greater than operator
 */
export const bigintGreaterThanOperator = createOperator({
  name: "bigint_gt",
  type: "custom",
  description: "Check if bigint value is greater than expected",
  evaluate: (actual: unknown, expected: unknown): boolean => {
    const a = toScaledBigInt(actual);
    const b = toScaledBigInt(expected);
    assertSameScale(a, b);
    return compare({ a: a.value, b: b.value, scale: a.scale }) > 0;
  },
  valueSchema: ScaledBigIntSchema,
});

/**
 * BigInt greater than or equal operator
 */
export const bigintGreaterThanOrEqualOperator = createOperator({
  name: "bigint_gte",
  type: "custom",
  description: "Check if bigint value is greater than or equal to expected",
  evaluate: (actual: unknown, expected: unknown): boolean => {
    const a = toScaledBigInt(actual);
    const b = toScaledBigInt(expected);
    assertSameScale(a, b);
    return compare({ a: a.value, b: b.value, scale: a.scale }) >= 0;
  },
  valueSchema: ScaledBigIntSchema,
});

/**
 * BigInt less than operator
 */
export const bigintLessThanOperator = createOperator({
  name: "bigint_lt",
  type: "custom",
  description: "Check if bigint value is less than expected",
  evaluate: (actual: unknown, expected: unknown): boolean => {
    const a = toScaledBigInt(actual);
    const b = toScaledBigInt(expected);
    assertSameScale(a, b);
    return compare({ a: a.value, b: b.value, scale: a.scale }) < 0;
  },
  valueSchema: ScaledBigIntSchema,
});

/**
 * BigInt less than or equal operator
 */
export const bigintLessThanOrEqualOperator = createOperator({
  name: "bigint_lte",
  type: "custom",
  description: "Check if bigint value is less than or equal to expected",
  evaluate: (actual: unknown, expected: unknown): boolean => {
    const a = toScaledBigInt(actual);
    const b = toScaledBigInt(expected);
    assertSameScale(a, b);
    return compare({ a: a.value, b: b.value, scale: a.scale }) <= 0;
  },
  valueSchema: ScaledBigIntSchema,
});
