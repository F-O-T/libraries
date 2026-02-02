/**
 * Money operators for @f-o-t/condition-evaluator integration
 *
 * Import individual operators to register with an evaluator:
 *
 * @example
 * import { createEvaluator } from "@f-o-t/condition-evaluator";
 * import { moneyEqualsOperator, moneyGreaterThanOperator } from "@f-o-t/money/operators";
 *
 * const evaluator = createEvaluator({
 *    operators: {
 *       money_eq: moneyEqualsOperator,
 *       money_gt: moneyGreaterThanOperator,
 *    }
 * });
 *
 * evaluator.evaluate({
 *    type: "custom",
 *    field: "transactionAmount",
 *    operator: "money_gt",
 *    value: { amount: "100.00", currency: "BRL" }
 * }, { data: { transactionAmount: { amount: "150.00", currency: "BRL" } } });
 */

// Re-export individual operators directly from comparison
export {
   moneyBetweenOperator,
   moneyEqualsOperator,
   moneyGreaterThanOperator,
   moneyGreaterThanOrEqualOperator,
   moneyLessThanOperator,
   moneyLessThanOrEqualOperator,
   moneyNegativeOperator,
   moneyNotEqualsOperator,
   moneyPositiveOperator,
   moneyZeroOperator,
} from "../../operations/comparison";
