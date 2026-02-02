import { createOperator } from "@f-o-t/condition-evaluator";
import type { CustomOperatorConfig } from "@f-o-t/condition-evaluator";
import { z } from "zod";
import { assertSameCurrency } from "../core/assertions";
import { minorUnitsToDecimal } from "../core/internal";
import { of } from "../core/money";
import { MoneySchema } from "../schemas";
import type { Money, MoneyJSON } from "../types";

/**
 * Convert a value to Money
 * Handles Money objects, MoneyJSON, and serialized objects
 */
function toMoney(value: unknown): Money {
   if (value === null || value === undefined) {
      throw new Error("Cannot convert null/undefined to Money");
   }

   // Already a Money object
   if (
      typeof value === "object" &&
      "amount" in value &&
      "currency" in value &&
      "scale" in value &&
      typeof (value as Money).amount === "bigint"
   ) {
      return value as Money;
   }

   // MoneyJSON format
   if (
      typeof value === "object" &&
      "amount" in value &&
      "currency" in value &&
      typeof (value as MoneyJSON).amount === "string"
   ) {
      const json = value as MoneyJSON;
      return of(json.amount, json.currency);
   }

   throw new Error(`Cannot convert value to Money: ${JSON.stringify(value)}`);
}

/**
 * Convert Money to JSON for operator comparison
 */
export function toJSON(money: Money): MoneyJSON {
   return {
      amount: minorUnitsToDecimal(money.amount, money.scale),
      currency: money.currency,
   };
}

// =============================================================================
// Operators using createOperator from condition-evaluator
// =============================================================================

/**
 * Money equals operator
 */
export const moneyEqualsOperator: any = createOperator({
   name: "money_eq",
   type: "custom",
   description: "Check if two Money values are equal",
   evaluate: (actual: unknown, expected: unknown): boolean => {
      const a = toMoney(actual);
      const b = toMoney(expected);
      assertSameCurrency(a, b);
      return a.amount === b.amount;
   },
   valueSchema: MoneySchema,
   reasonGenerator: (passed, actual, expected, field) => {
      const a = toMoney(actual);
      const b = toMoney(expected);
      if (passed) {
         return `${field} equals ${minorUnitsToDecimal(b.amount, b.scale)} ${b.currency}`;
      }
      return `${field} (${minorUnitsToDecimal(a.amount, a.scale)} ${a.currency}) does not equal ${minorUnitsToDecimal(b.amount, b.scale)} ${b.currency}`;
   },
});

/**
 * Money not equals operator
 */
export const moneyNotEqualsOperator: any = createOperator({
   name: "money_neq",
   type: "custom",
   description: "Check if two Money values are not equal",
   evaluate: (actual: unknown, expected: unknown): boolean => {
      const a = toMoney(actual);
      const b = toMoney(expected);
      assertSameCurrency(a, b);
      return a.amount !== b.amount;
   },
   valueSchema: MoneySchema,
});

/**
 * Money greater than operator
 */
export const moneyGreaterThanOperator: any = createOperator({
   name: "money_gt",
   type: "custom",
   description: "Check if Money value is greater than expected",
   evaluate: (actual: unknown, expected: unknown): boolean => {
      const a = toMoney(actual);
      const b = toMoney(expected);
      assertSameCurrency(a, b);
      return a.amount > b.amount;
   },
   valueSchema: MoneySchema,
});

/**
 * Money greater than or equal operator
 */
export const moneyGreaterThanOrEqualOperator: any = createOperator({
   name: "money_gte",
   type: "custom",
   description: "Check if Money value is greater than or equal to expected",
   evaluate: (actual: unknown, expected: unknown): boolean => {
      const a = toMoney(actual);
      const b = toMoney(expected);
      assertSameCurrency(a, b);
      return a.amount >= b.amount;
   },
   valueSchema: MoneySchema,
});

/**
 * Money less than operator
 */
export const moneyLessThanOperator: any = createOperator({
   name: "money_lt",
   type: "custom",
   description: "Check if Money value is less than expected",
   evaluate: (actual: unknown, expected: unknown): boolean => {
      const a = toMoney(actual);
      const b = toMoney(expected);
      assertSameCurrency(a, b);
      return a.amount < b.amount;
   },
   valueSchema: MoneySchema,
});

/**
 * Money less than or equal operator
 */
export const moneyLessThanOrEqualOperator: any = createOperator({
   name: "money_lte",
   type: "custom",
   description: "Check if Money value is less than or equal to expected",
   evaluate: (actual: unknown, expected: unknown): boolean => {
      const a = toMoney(actual);
      const b = toMoney(expected);
      assertSameCurrency(a, b);
      return a.amount <= b.amount;
   },
   valueSchema: MoneySchema,
});

/**
 * Money between operator (inclusive)
 */
export const moneyBetweenOperator: any = createOperator({
   name: "money_between",
   type: "custom",
   description: "Check if Money value is between two values (inclusive)",
   evaluate: (actual: unknown, expected: unknown): boolean => {
      if (!Array.isArray(expected) || expected.length !== 2) {
         throw new Error("Expected value must be an array of two Money values");
      }
      const a = toMoney(actual);
      const min = toMoney(expected[0]);
      const max = toMoney(expected[1]);
      assertSameCurrency(a, min);
      assertSameCurrency(a, max);
      return a.amount >= min.amount && a.amount <= max.amount;
   },
   valueSchema: z.tuple([MoneySchema, MoneySchema]),
});

/**
 * Money is positive operator
 */
export const moneyPositiveOperator: any = createOperator({
   name: "money_positive",
   type: "custom",
   description: "Check if Money value is positive (> 0)",
   evaluate: (actual: unknown): boolean => {
      const a = toMoney(actual);
      return a.amount > 0n;
   },
});

/**
 * Money is negative operator
 */
export const moneyNegativeOperator: any = createOperator({
   name: "money_negative",
   type: "custom",
   description: "Check if Money value is negative (< 0)",
   evaluate: (actual: unknown): boolean => {
      const a = toMoney(actual);
      return a.amount < 0n;
   },
});

/**
 * Money is zero operator
 */
export const moneyZeroOperator: any = createOperator({
   name: "money_zero",
   type: "custom",
   description: "Check if Money value is zero",
   evaluate: (actual: unknown): boolean => {
      const a = toMoney(actual);
      return a.amount === 0n;
   },
});

// =============================================================================
// Optimized convenience functions (direct BigInt comparison)
// Note: These are re-exported from comparison.ts for backward compatibility
// =============================================================================

export {
   equals,
   greaterThan,
   greaterThanOrEqual,
   lessThan,
   lessThanOrEqual,
   isPositive,
   isNegative,
   isZero,
   compare,
} from "./comparison";