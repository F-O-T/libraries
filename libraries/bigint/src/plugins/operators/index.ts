/**
 * BigInt operators for @f-o-t/condition-evaluator integration
 *
 * Import individual operators to register with an evaluator:
 *
 * @example
 * import { createEvaluator } from "@f-o-t/condition-evaluator";
 * import { bigintEqualsOperator, bigintGreaterThanOperator } from "@f-o-t/bigint/operators";
 *
 * const evaluator = createEvaluator({
 *    operators: {
 *       bigint_eq: bigintEqualsOperator,
 *       bigint_gt: bigintGreaterThanOperator,
 *    }
 * });
 *
 * evaluator.evaluate({
 *    type: "custom",
 *    field: "measurement",
 *    operator: "bigint_gt",
 *    value: { value: 100n, scale: 2 }
 * }, { data: { measurement: { value: 150n, scale: 2 } } });
 */

// Re-export comparison operators
export {
   bigintEqualsOperator,
   bigintGreaterThanOperator,
   bigintGreaterThanOrEqualOperator,
   bigintLessThanOperator,
   bigintLessThanOrEqualOperator,
   bigintNotEqualsOperator,
} from "./comparison";

// Re-export range operators
export {
   bigintBetweenOperator,
   bigintIsNegativeOperator,
   bigintIsPositiveOperator,
   bigintIsZeroOperator,
} from "./range";
