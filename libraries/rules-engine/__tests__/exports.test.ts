import { describe, expect, test } from "bun:test";
import { createEngine, createEvaluator, createOperator } from "../src/index";

describe("Public API exports", () => {
  test("should export createEvaluator", () => {
    expect(createEvaluator).toBeDefined();
    expect(typeof createEvaluator).toBe("function");
  });

  test("should export createOperator", () => {
    expect(createOperator).toBeDefined();
    expect(typeof createOperator).toBe("function");
  });

  test("should be able to use all exports together", () => {
    const customOp = createOperator({
      name: "test_op",
      type: "custom",
      evaluate: () => true,
    });

    const evaluator = createEvaluator({ operators: { test_op: customOp } });

    const engine = createEngine({
      evaluator,
    });

    expect(engine).toBeDefined();
  });
});
