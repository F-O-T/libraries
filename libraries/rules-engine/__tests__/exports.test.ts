import { describe, expect, test } from "bun:test";
import { createEvaluator, createOperator } from "@f-o-t/condition-evaluator";
import { createEngine } from "../src/index";

describe("Public API exports", () => {
  test("should export createEngine", () => {
    expect(createEngine).toBeDefined();
    expect(typeof createEngine).toBe("function");
  });

  test("should be able to use createEngine with condition-evaluator", () => {
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
