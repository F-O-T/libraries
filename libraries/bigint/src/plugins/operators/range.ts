import { createOperator } from "@f-o-t/condition-evaluator";
import { z } from "zod";
import { compare, isNegative, isPositive, isZero } from "../../compare";
import { type ScaledBigInt, ScaledBigIntSchema } from "../../schemas";

/**
 * Helper to validate and extract scaled bigint
 */
function toScaledBigInt(value: unknown): ScaledBigInt {
   return ScaledBigIntSchema.parse(value);
}

/**
 * BigInt between operator (inclusive range)
 */
export const bigintBetweenOperator = createOperator({
   name: "bigint_between",
   type: "custom",
   description: "Check if bigint value is between min and max (inclusive)",
   evaluate: (actual: unknown, expected: unknown): boolean => {
      const value = toScaledBigInt(actual);
      const range = z
         .object({
            min: ScaledBigIntSchema,
            max: ScaledBigIntSchema,
         })
         .parse(expected);

      // All must have same scale
      if (value.scale !== range.min.scale || value.scale !== range.max.scale) {
         throw new Error(
            `Scale mismatch in between comparison. All values must have the same scale.`,
         );
      }

      return (
         compare({ a: value.value, b: range.min.value, scale: value.scale }) >=
            0 &&
         compare({ a: value.value, b: range.max.value, scale: value.scale }) <=
            0
      );
   },
   valueSchema: z.object({
      min: ScaledBigIntSchema,
      max: ScaledBigIntSchema,
   }),
});

/**
 * BigInt is zero operator
 */
export const bigintIsZeroOperator = createOperator({
   name: "bigint_zero",
   type: "custom",
   description:
      "Check if bigint value is zero (or non-zero if expected is false)",
   evaluate: (actual: unknown, expected: unknown): boolean => {
      const value = toScaledBigInt(actual);
      const shouldBeZero = z.boolean().parse(expected);

      const valueIsZero = isZero({ a: value.value, b: 0n, scale: value.scale });
      return shouldBeZero ? valueIsZero : !valueIsZero;
   },
   valueSchema: z.boolean(),
});

/**
 * BigInt is positive operator
 */
export const bigintIsPositiveOperator = createOperator({
   name: "bigint_positive",
   type: "custom",
   description:
      "Check if bigint value is positive (or non-positive if expected is false)",
   evaluate: (actual: unknown, expected: unknown): boolean => {
      const value = toScaledBigInt(actual);
      const shouldBePositive = z.boolean().parse(expected);

      const valueIsPositive = isPositive({
         a: value.value,
         b: 0n,
         scale: value.scale,
      });
      return shouldBePositive ? valueIsPositive : !valueIsPositive;
   },
   valueSchema: z.boolean(),
});

/**
 * BigInt is negative operator
 */
export const bigintIsNegativeOperator = createOperator({
   name: "bigint_negative",
   type: "custom",
   description:
      "Check if bigint value is negative (or non-negative if expected is false)",
   evaluate: (actual: unknown, expected: unknown): boolean => {
      const value = toScaledBigInt(actual);
      const shouldBeNegative = z.boolean().parse(expected);

      const valueIsNegative = isNegative({
         a: value.value,
         b: 0n,
         scale: value.scale,
      });
      return shouldBeNegative ? valueIsNegative : !valueIsNegative;
   },
   valueSchema: z.boolean(),
});
