/**
 * Money operators for @f-o-t/condition-evaluator integration
 *
 * @example
 * import { createEvaluator } from "@f-o-t/condition-evaluator";
 * import { moneyEqualsOperator } from "@f-o-t/money/plugins/operators";
 *
 * const evaluator = createEvaluator({
 *    operators: { money_eq: moneyEqualsOperator }
 * });
 */

import { createOperator } from "@f-o-t/condition-evaluator";
import { z } from "zod";
import { assertSameCurrency } from "../../core/assertions";
import { minorUnitsToDecimal } from "../../core/internal";
import { of } from "../../core/money";
import { MoneySchema, type Money, type MoneyJSON } from "../../schemas";

function toMoney(value: unknown): Money {
   if (value === null || value === undefined) {
      throw new Error("Cannot convert null/undefined to Money");
   }
   if (
      typeof value === "object" &&
      "amount" in value &&
      "currency" in value &&
      "scale" in value &&
      typeof (value as Money).amount === "bigint"
   ) {
      return value as Money;
   }
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

export const moneyEqualsOperator = createOperator({
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

export const moneyNotEqualsOperator = createOperator({
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

export const moneyGreaterThanOperator = createOperator({
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

export const moneyGreaterThanOrEqualOperator = createOperator({
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

export const moneyLessThanOperator = createOperator({
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

export const moneyLessThanOrEqualOperator = createOperator({
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

export const moneyBetweenOperator = createOperator({
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

export const moneyPositiveOperator = createOperator({
   name: "money_positive",
   type: "custom",
   description: "Check if Money value is positive (> 0)",
   evaluate: (actual: unknown): boolean => {
      const a = toMoney(actual);
      return a.amount > 0n;
   },
});

export const moneyNegativeOperator = createOperator({
   name: "money_negative",
   type: "custom",
   description: "Check if Money value is negative (< 0)",
   evaluate: (actual: unknown): boolean => {
      const a = toMoney(actual);
      return a.amount < 0n;
   },
});

export const moneyZeroOperator = createOperator({
   name: "money_zero",
   type: "custom",
   description: "Check if Money value is zero",
   evaluate: (actual: unknown): boolean => {
      const a = toMoney(actual);
      return a.amount === 0n;
   },
});
