import { describe, expect, test } from "bun:test";
import { createEvaluator } from "@f-o-t/condition-evaluator";
import { createEngine } from "../src/engine/engine";

describe("Engine config with evaluator", () => {
  test("should accept evaluator instance in config", () => {
    const evaluator = createEvaluator();

    const engine = createEngine({
      evaluator,
    });

    expect(engine).toBeDefined();
  });

  test("should accept operators map in config", () => {
    const customOp = {
      name: "custom_op" as const,
      type: "custom" as const,
      evaluate: () => true,
    };

    const engine = createEngine({
      operators: { custom_op: customOp },
    });

    expect(engine).toBeDefined();
  });

  test("should throw error if neither evaluator nor operators provided", () => {
    expect(() => {
      createEngine({});
    }).toThrow("Engine requires either 'evaluator' or 'operators' config");
  });
});
