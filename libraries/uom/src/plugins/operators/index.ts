/**
 * Measurement operators for @f-o-t/condition-evaluator integration
 *
 * Import individual operators to register with an evaluator:
 *
 * @example
 * import { createEvaluator } from "@f-o-t/condition-evaluator";
 * import { measurementEqualsOperator, measurementGreaterThanOperator } from "@f-o-t/uom/operators";
 *
 * const evaluator = createEvaluator({
 *    operators: {
 *       measurement_eq: measurementEqualsOperator,
 *       measurement_gt: measurementGreaterThanOperator,
 *    }
 * });
 *
 * evaluator.evaluate({
 *    type: "custom",
 *    field: "weight",
 *    operator: "measurement_gt",
 *    value: { value: "100", unit: "kg", scale: 2, category: "weight" }
 * }, { data: { weight: { value: "150", unit: "kg", scale: 2, category: "weight" } } });
 */

// Re-export comparison operators
export {
	measurementEqualsOperator,
	measurementNotEqualsOperator,
	measurementGreaterThanOperator,
	measurementGreaterThanOrEqualOperator,
	measurementLessThanOperator,
	measurementLessThanOrEqualOperator,
} from "./comparison";
