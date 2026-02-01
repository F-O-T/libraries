# Rules Engine Evaluator Integration Refactor

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor rules-engine to use condition-evaluator's plugin system, enabling custom operators (like money operators) in rules.

**Architecture:** Remove hardcoded `evaluateConditionGroup` calls from rules-engine. Inject evaluator instance at engine creation via config. Thread evaluator through all evaluation functions. Maintain backward compatibility for built-in operators.

**Tech Stack:** TypeScript, Bun, Zod, @f-o-t/condition-evaluator plugin system

---

## Breaking Changes Summary

**What breaks:**
1. `createEngine()` signature - now requires `evaluator` or `operators` config
2. `evaluateRule()` function signature - now accepts evaluator parameter (internal API)
3. Users must explicitly configure operators if using custom types

**Migration path:**
```ts
// Before (v2.x)
const engine = createEngine({ consequences: MyConsequences });

// After (v3.x) - Option 1: Built-in operators only
const engine = createEngine({
  consequences: MyConsequences,
  evaluator: createEvaluator() // explicit, no custom operators
});

// After (v3.x) - Option 2: With custom operators
const engine = createEngine({
  consequences: MyConsequences,
  evaluator: createEvaluator({ operators: moneyOperators })
});

// After (v3.x) - Option 3: Convenience (engine creates evaluator)
const engine = createEngine({
  consequences: MyConsequences,
  operators: moneyOperators // engine creates evaluator internally
});
```

---

## Task 1: Add Evaluator to Engine Config Types

**Files:**
- Modify: `libraries/rules-engine/src/types/config.ts:117-132`

**Step 1: Write failing test for evaluator config**

Create: `libraries/rules-engine/__tests__/config.test.ts`

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/rules-engine && bun test __tests__/config.test.ts`

Expected: FAIL - type errors and runtime errors (evaluator/operators not in config)

**Step 3: Update EngineConfig type**

Modify: `libraries/rules-engine/src/types/config.ts`

```typescript
// Add import at top
import type { OperatorMap } from "@f-o-t/condition-evaluator";

// Update EngineConfig type (around line 117)
export type EngineConfig<
  TContext = unknown,
  TConsequences extends ConsequenceDefinitions = DefaultConsequences,
> = {
  readonly consequences?: TConsequences;
  readonly conflictResolution?: ConflictResolutionStrategy;
  readonly cache?: Partial<CacheConfig>;
  readonly validation?: Partial<ValidationConfig>;
  readonly versioning?: Partial<VersioningConfig>;
  readonly hooks?: EngineHooks<TContext, TConsequences>;
  readonly logLevel?: LogLevel;
  readonly logger?: Logger;
  readonly continueOnError?: boolean;
  readonly slowRuleThresholdMs?: number;
  readonly hookTimeoutMs?: number;

  // NEW: Evaluator configuration (mutually exclusive)
  readonly evaluator?: ReturnType<typeof import("@f-o-t/condition-evaluator").createEvaluator>;
  readonly operators?: OperatorMap;
};

// Update ResolvedEngineConfig type (around line 134)
export type ResolvedEngineConfig<
  TContext = unknown,
  TConsequences extends ConsequenceDefinitions = DefaultConsequences,
> = {
  readonly consequences: TConsequences | undefined;
  readonly conflictResolution: ConflictResolutionStrategy;
  readonly cache: CacheConfig;
  readonly validation: ValidationConfig;
  readonly versioning: VersioningConfig;
  readonly hooks: EngineHooks<TContext, TConsequences>;
  readonly logLevel: LogLevel;
  readonly logger: Logger;
  readonly continueOnError: boolean;
  readonly slowRuleThresholdMs: number;
  readonly hookTimeoutMs: number | undefined;

  // NEW: Resolved evaluator instance
  readonly evaluator: ReturnType<typeof import("@f-o-t/condition-evaluator").createEvaluator>;
};
```

**Step 4: Run test to verify partial progress**

Run: `cd libraries/rules-engine && bun test __tests__/config.test.ts`

Expected: Still FAIL - engine doesn't use evaluator yet

**Step 5: Commit**

```bash
git add libraries/rules-engine/src/types/config.ts libraries/rules-engine/__tests__/config.test.ts
git commit -m "feat(rules-engine)!: add evaluator to engine config types

BREAKING CHANGE: Engine now requires evaluator or operators config"
```

---

## Task 2: Update evaluateRule to Accept Evaluator

**Files:**
- Modify: `libraries/rules-engine/src/core/evaluate.ts:1-95`
- Modify: `libraries/rules-engine/__tests__/evaluate.test.ts`

**Step 1: Write failing test for evaluateRule with evaluator**

Modify: `libraries/rules-engine/__tests__/evaluate.test.ts`

Add test at the end of the file:

```typescript
import { createEvaluator, createOperator } from "@f-o-t/condition-evaluator";

describe("evaluateRule with custom evaluator", () => {
  test("should use provided evaluator for custom operators", () => {
    const customOp = createOperator({
      name: "always_true",
      type: "custom",
      evaluate: () => true,
    });

    const evaluator = createEvaluator({
      operators: { always_true: customOp }
    });

    const rule = createTestRule({
      conditions: {
        id: "group-1",
        operator: "AND",
        conditions: [
          {
            id: "cond-1",
            type: "custom",
            field: "anything",
            operator: "always_true",
          },
        ],
      },
    });

    const context = {
      data: { anything: "value" },
      timestamp: new Date(),
    };

    const result = evaluateRule(rule, context, evaluator);

    expect(result.matched).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/rules-engine && bun test __tests__/evaluate.test.ts -t "custom evaluator"`

Expected: FAIL - evaluateRule doesn't accept evaluator parameter

**Step 3: Update evaluateRule signature and implementation**

Modify: `libraries/rules-engine/src/core/evaluate.ts`

```typescript
// Update imports
import {
  createEvaluator,
  type GroupEvaluationResult,
} from "@f-o-t/condition-evaluator";
import type {
  AggregatedConsequence,
  ConsequenceDefinitions,
  DefaultConsequences,
} from "../types/consequence";
import type {
  EvaluateConfig,
  EvaluationContext,
  RuleEvaluationResult,
} from "../types/evaluation";
import type { Rule } from "../types/rule";
import { measureTime } from "../utils/time";

export type EvaluateRuleOptions = {
  readonly skipDisabled?: boolean;
};

// Update evaluateRule signature - add evaluator parameter
export const evaluateRule = <
  TContext = unknown,
  TConsequences extends ConsequenceDefinitions = DefaultConsequences,
>(
  rule: Rule<TContext, TConsequences>,
  context: EvaluationContext<TContext>,
  evaluator: ReturnType<typeof createEvaluator>,
  options: EvaluateRuleOptions = {},
): RuleEvaluationResult<TContext, TConsequences> => {
  if (options.skipDisabled && !rule.enabled) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched: false,
      conditionResult: createEmptyGroupResult(rule.conditions.id),
      consequences: [],
      evaluationTimeMs: 0,
      skipped: true,
      skipReason: "Rule is disabled",
    };
  }

  const { result: conditionResult, durationMs } = measureTime(() => {
    try {
      const evalContext = {
        data: context.data as Record<string, unknown>,
        metadata: context.metadata as Record<string, unknown> | undefined,
      };
      // Use the provided evaluator instead of hardcoded evaluateConditionGroup
      return evaluator.evaluateConditionGroup(rule.conditions, evalContext);
    } catch (error) {
      return {
        error,
        result: createEmptyGroupResult(rule.conditions.id),
      };
    }
  });

  if ("error" in conditionResult) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched: false,
      conditionResult: conditionResult.result,
      consequences: [],
      evaluationTimeMs: durationMs,
      skipped: false,
      error:
        conditionResult.error instanceof Error
          ? conditionResult.error
          : new Error(String(conditionResult.error)),
    };
  }

  const matched = conditionResult.passed;

  const consequences: AggregatedConsequence<TConsequences>[] = matched
    ? rule.consequences.map((consequence) => ({
         type: consequence.type,
         payload: consequence.payload,
         ruleId: rule.id,
         ruleName: rule.name,
         priority: rule.priority,
      }))
    : [];

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    matched,
    conditionResult,
    consequences,
    evaluationTimeMs: durationMs,
    skipped: false,
  };
};

const createEmptyGroupResult = (groupId: string): GroupEvaluationResult => ({
  groupId,
  operator: "AND",
  passed: false,
  results: [],
});

// Update evaluateRules to accept and pass evaluator
export type EvaluateRulesOptions<
  TContext = unknown,
  TConsequences extends ConsequenceDefinitions = DefaultConsequences,
> = {
  readonly config?: Partial<EvaluateConfig>;
  readonly onRuleEvaluated?: (
    result: RuleEvaluationResult<TContext, TConsequences>,
  ) => void;
};

export type EvaluateRulesResult<
  TContext = unknown,
  TConsequences extends ConsequenceDefinitions = DefaultConsequences,
> = {
  readonly results: ReadonlyArray<
    RuleEvaluationResult<TContext, TConsequences>
  >;
  readonly matchedRules: ReadonlyArray<Rule<TContext, TConsequences>>;
  readonly consequences: ReadonlyArray<AggregatedConsequence<TConsequences>>;
  readonly stoppedEarly: boolean;
  readonly stoppedByRuleId?: string;
};

export const evaluateRules = <
  TContext = unknown,
  TConsequences extends ConsequenceDefinitions = DefaultConsequences,
>(
  rules: ReadonlyArray<Rule<TContext, TConsequences>>,
  context: EvaluationContext<TContext>,
  evaluator: ReturnType<typeof createEvaluator>,
  options: EvaluateRulesOptions<TContext, TConsequences> = {},
): EvaluateRulesResult<TContext, TConsequences> => {
  const config: EvaluateConfig = {
    conflictResolution: options.config?.conflictResolution ?? "priority",
    continueOnError: options.config?.continueOnError ?? true,
    collectAllConsequences: options.config?.collectAllConsequences ?? true,
  };

  const results: RuleEvaluationResult<TContext, TConsequences>[] = [];
  const matchedRules: Rule<TContext, TConsequences>[] = [];
  const consequences: AggregatedConsequence<TConsequences>[] = [];
  let stoppedEarly = false;
  let stoppedByRuleId: string | undefined;

  for (const rule of rules) {
    const result = evaluateRule(rule, context, evaluator, { skipDisabled: true });
    results.push(result);

    options.onRuleEvaluated?.(result);

    if (result.error && !config.continueOnError) {
      break;
    }

    if (result.matched) {
      matchedRules.push(rule);
      consequences.push(...result.consequences);

      if (rule.stopOnMatch) {
        stoppedEarly = true;
        stoppedByRuleId = rule.id;
        break;
      }

      if (config.conflictResolution === "first-match") {
        stoppedEarly = true;
        stoppedByRuleId = rule.id;
        break;
      }
    }
  }

  return {
    results,
    matchedRules,
    consequences,
    stoppedEarly,
    stoppedByRuleId,
  };
};
```

**Step 4: Update all existing evaluate.test.ts tests**

Modify: `libraries/rules-engine/__tests__/evaluate.test.ts`

Add at top:
```typescript
import { createEvaluator } from "@f-o-t/condition-evaluator";
```

Update all `evaluateRule` calls to include default evaluator:
```typescript
// Before:
const result = evaluateRule(rule, context);

// After:
const evaluator = createEvaluator();
const result = evaluateRule(rule, context, evaluator);
```

Do this for all tests in the file.

**Step 5: Run tests to verify they pass**

Run: `cd libraries/rules-engine && bun test __tests__/evaluate.test.ts`

Expected: PASS (all tests including new custom operator test)

**Step 6: Commit**

```bash
git add libraries/rules-engine/src/core/evaluate.ts libraries/rules-engine/__tests__/evaluate.test.ts
git commit -m "feat(rules-engine)!: evaluateRule now accepts evaluator parameter

BREAKING CHANGE: evaluateRule signature changed to require evaluator"
```

---

## Task 3: Update Engine to Create and Store Evaluator

**Files:**
- Modify: `libraries/rules-engine/src/engine/engine.ts:112-141`
- Modify: `libraries/rules-engine/src/engine/engine.ts:230-242`

**Step 1: Write failing test for engine with operators**

Modify: `libraries/rules-engine/__tests__/engine.test.ts`

Add new test suite at the end:

```typescript
import { createEvaluator, createOperator } from "@f-o-t/condition-evaluator";

describe("Engine with custom operators", () => {
  test("should accept evaluator in config", () => {
    const evaluator = createEvaluator();

    const engine = createEngine<TestContext, TestConsequences>({
      consequences: TestConsequences,
      evaluator,
    });

    expect(engine).toBeDefined();
  });

  test("should create evaluator from operators config", () => {
    const customOp = createOperator({
      name: "always_match",
      type: "custom",
      evaluate: () => true,
    });

    const engine = createEngine<TestContext, TestConsequences>({
      consequences: TestConsequences,
      operators: { always_match: customOp },
    });

    expect(engine).toBeDefined();
  });

  test("should use custom operator in rule evaluation", async () => {
    const customOp = createOperator({
      name: "always_match",
      type: "custom",
      evaluate: () => true,
    });

    const engine = createEngine<TestContext, TestConsequences>({
      consequences: TestConsequences,
      operators: { always_match: customOp },
    });

    engine.addRule({
      name: "custom-op-rule",
      conditions: {
        id: "g1",
        operator: "AND",
        conditions: [
          {
            id: "c1",
            type: "custom",
            field: "anything",
            operator: "always_match",
          },
        ],
      },
      consequences: [
        {
          type: "setFlag",
          payload: { name: "matched", value: true },
        },
      ],
    });

    const result = await engine.evaluate({
      age: 25,
      country: "BR",
      premium: false,
      score: 100
    });

    expect(result.matchedRules).toHaveLength(1);
    expect(result.matchedRules[0]?.name).toBe("custom-op-rule");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/rules-engine && bun test __tests__/engine.test.ts -t "custom operators"`

Expected: FAIL - engine doesn't accept evaluator/operators config yet

**Step 3: Update resolveConfig to create evaluator**

Modify: `libraries/rules-engine/src/engine/engine.ts`

Add import at top:
```typescript
import { createEvaluator } from "@f-o-t/condition-evaluator";
```

Update `resolveConfig` function (around line 112):

```typescript
const resolveConfig = <
  TContext = unknown,
  TConsequences extends ConsequenceDefinitions = DefaultConsequences,
>(
  config: EngineConfig<TContext, TConsequences>,
): ResolvedEngineConfig<TContext, TConsequences> => {
  // Validate evaluator config
  if (!config.evaluator && !config.operators) {
    throw new Error(
      "Engine requires either 'evaluator' or 'operators' config. " +
      "Pass { evaluator: createEvaluator() } for built-in operators only, " +
      "or { operators: customOperators } to use custom operators."
    );
  }

  // Create evaluator from config
  const evaluator = config.evaluator
    ? config.evaluator
    : createEvaluator({ operators: config.operators });

  return {
    consequences: config.consequences,
    conflictResolution:
      config.conflictResolution ?? getDefaultConflictResolution(),
    cache: {
      ...getDefaultCacheConfig(),
      ...config.cache,
    },
    validation: {
      ...getDefaultValidationConfig(),
      ...config.validation,
    },
    versioning: {
      ...getDefaultVersioningConfig(),
      ...config.versioning,
    },
    hooks: config.hooks ?? {},
    logLevel: config.logLevel ?? getDefaultLogLevel(),
    logger: config.logger ?? console,
    continueOnError: config.continueOnError ?? true,
    slowRuleThresholdMs: config.slowRuleThresholdMs ?? 10,
    hookTimeoutMs: config.hookTimeoutMs,
    evaluator, // Add to resolved config
  };
};
```

**Step 4: Update engine evaluate function to pass evaluator**

Modify: `libraries/rules-engine/src/engine/engine.ts`

Update the `evaluate` function (around line 230) to pass evaluator to `evaluateRule`:

```typescript
const { result: evaluationResult, durationMs } = measureTime(() => {
  const results: Array<{
    rule: Rule<TContext, TConsequences>;
    result: ReturnType<typeof evaluateRule<TContext, TConsequences>>;
  }> = [];

  for (const rule of rulesToEvaluate) {
    // Pass evaluator from resolved config
    const result = evaluateRule(rule, context, resolvedConfig.evaluator, { skipDisabled: true });
    results.push({ rule, result });
  }

  return results;
});
```

**Step 5: Run tests to verify they pass**

Run: `cd libraries/rules-engine && bun test __tests__/engine.test.ts`

Expected: FAIL - existing tests don't provide evaluator config

**Step 6: Update all existing engine tests**

Modify: `libraries/rules-engine/__tests__/engine.test.ts`

Add import:
```typescript
import { createEvaluator } from "@f-o-t/condition-evaluator";
```

Update `beforeEach` in first describe block (around line 78):

```typescript
beforeEach(() => {
  engine = createEngine<TestContext, TestConsequences>({
    consequences: TestConsequences,
    evaluator: createEvaluator(), // Add this
  });
});
```

Search for all other `createEngine` calls in the file and add `evaluator: createEvaluator()` to each.

**Step 7: Run tests again to verify they pass**

Run: `cd libraries/rules-engine && bun test __tests__/engine.test.ts`

Expected: PASS (all tests including new custom operator tests)

**Step 8: Commit**

```bash
git add libraries/rules-engine/src/engine/engine.ts libraries/rules-engine/__tests__/engine.test.ts
git commit -m "feat(rules-engine)!: engine creates evaluator from config

BREAKING CHANGE: createEngine now requires evaluator or operators config"
```

---

## Task 4: Update All Other Test Files

**Files:**
- Modify: `libraries/rules-engine/__tests__/integration.test.ts`
- Modify: `libraries/rules-engine/__tests__/validation.test.ts`
- Modify: `libraries/rules-engine/__tests__/builder.test.ts`
- Modify: `libraries/rules-engine/__tests__/cache.test.ts`
- Modify: `libraries/rules-engine/__tests__/filter-sort.test.ts`

**Step 1: Update integration.test.ts**

Run: `cd libraries/rules-engine && bun test __tests__/integration.test.ts`

Expected: FAIL (missing evaluator config)

Modify: `libraries/rules-engine/__tests__/integration.test.ts`

Add import:
```typescript
import { createEvaluator } from "@f-o-t/condition-evaluator";
```

Find all `createEngine` calls and add `evaluator: createEvaluator()`.

Run: `cd libraries/rules-engine && bun test __tests__/integration.test.ts`

Expected: PASS

**Step 2: Update validation.test.ts**

Run: `cd libraries/rules-engine && bun test __tests__/validation.test.ts`

If it uses `createEngine`:
- Add import for `createEvaluator`
- Add `evaluator: createEvaluator()` to all `createEngine` calls

Run: `cd libraries/rules-engine && bun test __tests__/validation.test.ts`

Expected: PASS

**Step 3: Update builder.test.ts**

Run: `cd libraries/rules-engine && bun test __tests__/builder.test.ts`

If it uses `createEngine`:
- Add import for `createEvaluator`
- Add `evaluator: createEvaluator()` to all `createEngine` calls

Run: `cd libraries/rules-engine && bun test __tests__/builder.test.ts`

Expected: PASS

**Step 4: Update cache.test.ts**

Run: `cd libraries/rules-engine && bun test __tests__/cache.test.ts`

If it uses `createEngine`:
- Add import for `createEvaluator`
- Add `evaluator: createEvaluator()` to all `createEngine` calls

Run: `cd libraries/rules-engine && bun test __tests__/cache.test.ts`

Expected: PASS

**Step 5: Update filter-sort.test.ts**

Run: `cd libraries/rules-engine && bun test __tests__/filter-sort.test.ts`

If it uses `createEngine`:
- Add import for `createEvaluator`
- Add `evaluator: createEvaluator()` to all `createEngine` calls

Run: `cd libraries/rules-engine && bun test __tests__/filter-sort.test.ts`

Expected: PASS

**Step 6: Run all tests**

Run: `cd libraries/rules-engine && bun test`

Expected: ALL PASS

**Step 7: Commit**

```bash
git add libraries/rules-engine/__tests__/*.test.ts
git commit -m "test(rules-engine): update all tests for evaluator requirement"
```

---

## Task 5: Update Exports and Public API

**Files:**
- Modify: `libraries/rules-engine/src/index.ts`

**Step 1: Review current exports**

Read: `libraries/rules-engine/src/index.ts`

Check what's exported from condition-evaluator.

**Step 2: Update exports to include createEvaluator**

Modify: `libraries/rules-engine/src/index.ts`

Find the condition-evaluator exports section (around line 1-23) and ensure `createEvaluator` is re-exported:

```typescript
export type {
  ArrayCondition,
  ArrayOperator,
  BooleanCondition,
  BooleanOperator,
  Condition,
  ConditionGroup,
  CustomCondition,
  DateCondition,
  DateOperator,
  EvaluationResult,
  GroupEvaluationResult,
  LogicalOperator,
  NumberCondition,
  NumberOperator,
  StringCondition,
  StringOperator,
} from "@f-o-t/condition-evaluator";
export {
  ConditionGroup as ConditionGroupSchema,
  isConditionGroup,
  createEvaluator, // ADD THIS
  createOperator,  // ADD THIS if not already exported
} from "@f-o-t/condition-evaluator";
```

**Step 3: Verify exports work**

Create test file: `libraries/rules-engine/__tests__/exports.test.ts`

```typescript
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
```

Run: `cd libraries/rules-engine && bun test __tests__/exports.test.ts`

Expected: PASS

**Step 4: Commit**

```bash
git add libraries/rules-engine/src/index.ts libraries/rules-engine/__tests__/exports.test.ts
git commit -m "feat(rules-engine): re-export createEvaluator and createOperator"
```

---

## Task 6: Update README and Documentation

**Files:**
- Modify: `libraries/rules-engine/README.md`
- Create: `libraries/rules-engine/docs/MIGRATION-v3.md`

**Step 1: Create migration guide**

Create: `libraries/rules-engine/docs/MIGRATION-v3.md`

```markdown
# Migration Guide: v2.x → v3.0

## Breaking Changes

### Engine requires evaluator configuration

**What changed:**
The engine now requires explicit evaluator configuration to enable custom operators.

**Before (v2.x):**
```typescript
import { createEngine } from "@f-o-t/rules-engine";

const engine = createEngine({
  consequences: MyConsequences,
});
```

**After (v3.x):**
```typescript
import { createEngine, createEvaluator } from "@f-o-t/rules-engine";

// Option 1: Built-in operators only
const engine = createEngine({
  consequences: MyConsequences,
  evaluator: createEvaluator(),
});

// Option 2: With custom operators
import { moneyOperators } from "@f-o-t/money/operators";

const engine = createEngine({
  consequences: MyConsequences,
  evaluator: createEvaluator({ operators: moneyOperators }),
});

// Option 3: Convenience (engine creates evaluator)
const engine = createEngine({
  consequences: MyConsequences,
  operators: moneyOperators,
});
```

### Internal API changes

If you were using `evaluateRule` or `evaluateRules` directly (not through the engine), these now require an evaluator parameter:

**Before:**
```typescript
import { evaluateRule } from "@f-o-t/rules-engine";

const result = evaluateRule(rule, context);
```

**After:**
```typescript
import { evaluateRule, createEvaluator } from "@f-o-t/rules-engine";

const evaluator = createEvaluator();
const result = evaluateRule(rule, context, evaluator);
```

## New Features

### Custom operators in rules

You can now use custom operators from any library:

```typescript
import { createEngine, createEvaluator } from "@f-o-t/rules-engine";
import { moneyOperators } from "@f-o-t/money/operators";

const engine = createEngine({
  operators: moneyOperators,
});

engine.addRule({
  name: "high-value-transaction",
  conditions: {
    id: "g1",
    operator: "AND",
    conditions: [
      {
        id: "c1",
        type: "custom",
        field: "transactionAmount",
        operator: "money_gt",
        value: { amount: "1000.00", currency: "BRL" },
      },
    ],
  },
  consequences: [
    { type: "require_approval", payload: { level: "manager" } },
  ],
});
```

### Compose multiple operator sets

```typescript
import { moneyOperators } from "@f-o-t/money/operators";
import { dateOperators } from "./my-date-operators";

const engine = createEngine({
  operators: {
    ...moneyOperators,
    ...dateOperators,
  },
});
```

## Why this change?

This breaking change enables:
1. **Custom operators** - Use domain-specific operators like `money_gt`, `money_between`
2. **Type safety** - Better TypeScript support for custom operator types
3. **Extensibility** - Easier to add new operator types
4. **Consistency** - Aligns with condition-evaluator's plugin architecture
```

**Step 2: Update README with new usage**

Modify: `libraries/rules-engine/README.md`

Find the "Quick Start" or "Usage" section and update it:

```markdown
## Quick Start

```typescript
import { createEngine, createEvaluator } from "@f-o-t/rules-engine";
import { z } from "zod";

// Define your consequence types
const MyConsequences = {
  send_email: z.object({
    to: z.string().email(),
    subject: z.string(),
  }),
  apply_discount: z.object({
    percentage: z.number(),
  }),
};

// Create engine with built-in operators
const engine = createEngine({
  consequences: MyConsequences,
  evaluator: createEvaluator(), // Required!
});

// Or with custom operators
import { moneyOperators } from "@f-o-t/money/operators";

const engine = createEngine({
  consequences: MyConsequences,
  operators: moneyOperators, // Convenience: engine creates evaluator
});

// Add rules
engine.addRule({
  name: "high-value-customer",
  conditions: {
    id: "g1",
    operator: "AND",
    conditions: [
      {
        id: "c1",
        type: "number",
        field: "totalPurchases",
        operator: "gt",
        value: 1000,
      },
    ],
  },
  consequences: [
    {
      type: "apply_discount",
      payload: { percentage: 10 },
    },
  ],
});

// Evaluate
const result = await engine.evaluate({
  totalPurchases: 1500,
});

console.log(result.matchedRules); // Rules that matched
console.log(result.consequences); // Actions to take
```
```

Add a new section for custom operators:

```markdown
## Custom Operators

Use custom operators from libraries like `@f-o-t/money`:

```typescript
import { createEngine } from "@f-o-t/rules-engine";
import { moneyOperators } from "@f-o-t/money/operators";

const engine = createEngine({
  operators: moneyOperators,
});

engine.addRule({
  name: "large-transaction",
  conditions: {
    id: "g1",
    operator: "AND",
    conditions: [
      {
        id: "c1",
        type: "custom",
        field: "amount",
        operator: "money_gt",
        value: { amount: "5000.00", currency: "BRL" },
      },
    ],
  },
  consequences: [
    { type: "flag_for_review", payload: {} },
  ],
});
```

Create your own custom operators:

```typescript
import { createEngine, createOperator } from "@f-o-t/rules-engine";

const customOperator = createOperator({
  name: "is_valid_cpf",
  type: "custom",
  description: "Validate Brazilian CPF",
  evaluate: (actual, expected) => {
    // Your validation logic
    return validateCPF(actual as string);
  },
});

const engine = createEngine({
  operators: { is_valid_cpf: customOperator },
});
```
```

**Step 3: Commit**

```bash
git add libraries/rules-engine/README.md libraries/rules-engine/docs/MIGRATION-v3.md
git commit -m "docs(rules-engine): add v3 migration guide and update README"
```

---

## Task 7: Update CHANGELOG

**Files:**
- Modify: `libraries/rules-engine/CHANGELOG.md`

**Step 1: Add v3.0.0 entry to changelog**

Modify: `libraries/rules-engine/CHANGELOG.md`

Add at the top:

```markdown
# Changelog

## [3.0.0] - 2026-01-31

### ⚠️ BREAKING CHANGES

- Engine now requires `evaluator` or `operators` configuration
- `evaluateRule()` function signature changed to accept evaluator parameter
- `evaluateRules()` function signature changed to accept evaluator parameter

### 🎉 Features

- **Custom operators support**: Use custom operators from any library (e.g., `@f-o-t/money/operators`)
- **Plugin system integration**: Full integration with `@f-o-t/condition-evaluator` plugin system
- **Better extensibility**: Easily compose multiple operator sets
- **Type-safe operators**: Better TypeScript support for custom operator types

### 📚 Documentation

- Added migration guide for v2 → v3
- Updated README with custom operator examples
- Added examples for money operators integration

### 🔧 Migration

See [MIGRATION-v3.md](./docs/MIGRATION-v3.md) for detailed migration instructions.

**Quick migration:**
```typescript
// Before (v2.x)
const engine = createEngine({ consequences: MyConsequences });

// After (v3.x)
const engine = createEngine({
  consequences: MyConsequences,
  evaluator: createEvaluator() // Add this
});
```

---

[Rest of existing changelog...]
```

**Step 2: Commit**

```bash
git add libraries/rules-engine/CHANGELOG.md
git commit -m "docs(rules-engine): add v3.0.0 changelog entry"
```

---

## Task 8: Bump Version and Verify Build

**Files:**
- Modify: `libraries/rules-engine/package.json`

**Step 1: Update version to 3.0.0**

Modify: `libraries/rules-engine/package.json`

Change line 3:
```json
"version": "3.0.0",
```

**Step 2: Run full test suite**

Run: `cd libraries/rules-engine && bun test`

Expected: ALL PASS

**Step 3: Build the library**

Run: `cd libraries/rules-engine && bun run build`

Expected: Build succeeds, no errors

**Step 4: Check generated types**

Run: `cat libraries/rules-engine/dist/index.d.ts | grep createEvaluator`

Expected: `createEvaluator` is exported

**Step 5: Commit**

```bash
git add libraries/rules-engine/package.json
git commit -m "chore(rules-engine): bump version to 3.0.0"
```

---

## Task 9: Create Integration Test with Money Operators

**Files:**
- Create: `libraries/rules-engine/__tests__/money-integration.test.ts`

**Step 1: Write integration test with money operators**

Create: `libraries/rules-engine/__tests__/money-integration.test.ts`

```typescript
import { describe, expect, test } from "bun:test";
import { createEngine } from "../src/engine/engine";
import { moneyOperators } from "@f-o-t/money/operators";
import { z } from "zod";

type TransactionContext = {
  amount: {
    amount: string;
    currency: string;
  };
  accountBalance: {
    amount: string;
    currency: string;
  };
};

const TransactionConsequences = {
  approve: z.object({ approved: z.boolean() }),
  require_review: z.object({ reason: z.string() }),
  reject: z.object({ reason: z.string() }),
} as const;

describe("Money operators integration", () => {
  test("should use money_gt operator in rules", async () => {
    const engine = createEngine<TransactionContext, typeof TransactionConsequences>({
      consequences: TransactionConsequences,
      operators: moneyOperators,
    });

    engine.addRule({
      name: "high-value-transaction",
      conditions: {
        id: "g1",
        operator: "AND",
        conditions: [
          {
            id: "c1",
            type: "custom",
            field: "amount",
            operator: "money_gt",
            value: { amount: "1000.00", currency: "BRL" },
          },
        ],
      },
      consequences: [
        {
          type: "require_review",
          payload: { reason: "High value transaction" },
        },
      ],
    });

    const result = await engine.evaluate({
      amount: { amount: "1500.00", currency: "BRL" },
      accountBalance: { amount: "10000.00", currency: "BRL" },
    });

    expect(result.matchedRules).toHaveLength(1);
    expect(result.matchedRules[0]?.name).toBe("high-value-transaction");
    expect(result.consequences).toHaveLength(1);
    expect(result.consequences[0]?.type).toBe("require_review");
  });

  test("should use money_between operator", async () => {
    const engine = createEngine<TransactionContext, typeof TransactionConsequences>({
      consequences: TransactionConsequences,
      operators: moneyOperators,
    });

    engine.addRule({
      name: "medium-value-transaction",
      conditions: {
        id: "g1",
        operator: "AND",
        conditions: [
          {
            id: "c1",
            type: "custom",
            field: "amount",
            operator: "money_between",
            value: [
              { amount: "100.00", currency: "BRL" },
              { amount: "1000.00", currency: "BRL" },
            ],
          },
        ],
      },
      consequences: [
        {
          type: "approve",
          payload: { approved: true },
        },
      ],
    });

    const result = await engine.evaluate({
      amount: { amount: "500.00", currency: "BRL" },
      accountBalance: { amount: "10000.00", currency: "BRL" },
    });

    expect(result.matchedRules).toHaveLength(1);
    expect(result.consequences[0]?.type).toBe("approve");
  });

  test("should handle multiple money conditions", async () => {
    const engine = createEngine<TransactionContext, typeof TransactionConsequences>({
      consequences: TransactionConsequences,
      operators: moneyOperators,
    });

    engine.addRule({
      name: "insufficient-funds",
      conditions: {
        id: "g1",
        operator: "AND",
        conditions: [
          {
            id: "c1",
            type: "custom",
            field: "amount",
            operator: "money_gt",
            value: { amount: "0.00", currency: "BRL" },
          },
          {
            id: "c2",
            type: "custom",
            field: "accountBalance",
            operator: "money_lt",
            value: { amount: "100.00", currency: "BRL" },
          },
        ],
      },
      consequences: [
        {
          type: "reject",
          payload: { reason: "Insufficient funds" },
        },
      ],
    });

    const result = await engine.evaluate({
      amount: { amount: "50.00", currency: "BRL" },
      accountBalance: { amount: "25.00", currency: "BRL" },
    });

    expect(result.matchedRules).toHaveLength(1);
    expect(result.consequences[0]?.type).toBe("reject");
  });
});
```

**Step 2: Run test to verify integration**

Run: `cd libraries/rules-engine && bun test __tests__/money-integration.test.ts`

Expected: PASS

**Step 3: Commit**

```bash
git add libraries/rules-engine/__tests__/money-integration.test.ts
git commit -m "test(rules-engine): add money operators integration tests"
```

---

## Task 10: Final Verification and Tag

**Step 1: Run all tests across the monorepo**

Run: `cd /home/yorizel/Documents/fot-libraries && bun test`

Expected: ALL PASS (including condition-evaluator and rules-engine)

**Step 2: Build all packages**

Run: `cd /home/yorizel/Documents/fot-libraries && bun run build`

Expected: All builds succeed

**Step 3: Check for type errors**

Run: `cd libraries/rules-engine && bunx tsc --noEmit`

Expected: No errors

**Step 4: Verify exports**

Create temporary test file: `/tmp/test-exports.ts`

```typescript
import {
  createEngine,
  createEvaluator,
  createOperator,
  type Engine,
  type Rule,
} from "@f-o-t/rules-engine";

const op = createOperator({
  name: "test",
  type: "custom",
  evaluate: () => true,
});

const evaluator = createEvaluator({ operators: { test: op } });

const engine = createEngine({ evaluator });

console.log("All exports working!");
```

Run: `cd libraries/rules-engine && bun run /tmp/test-exports.ts`

Expected: "All exports working!"

**Step 5: Create git tag**

```bash
cd /home/yorizel/Documents/fot-libraries
git tag -a @f-o-t/rules-engine@3.0.0 -m "feat(rules-engine)!: integrate with condition-evaluator plugin system

BREAKING CHANGE: Engine now requires evaluator or operators config.
Enables custom operators like money_gt, money_between in rules."

git push origin @f-o-t/rules-engine@3.0.0
```

**Step 6: Final commit**

```bash
git add .
git commit -m "feat(rules-engine)!: complete v3.0.0 evaluator integration

- Remove hardcoded evaluateConditionGroup calls
- Inject evaluator at engine creation
- Enable custom operators (money, etc) in rules
- Update all tests and documentation
- Add migration guide

BREAKING CHANGE: createEngine() now requires evaluator or operators config"
```

---

## Summary

**What was accomplished:**

1. ✅ Added evaluator to engine config types
2. ✅ Updated `evaluateRule` to accept evaluator parameter
3. ✅ Engine creates evaluator from config (evaluator or operators)
4. ✅ All tests updated and passing
5. ✅ Public API exports `createEvaluator` and `createOperator`
6. ✅ Documentation and migration guide
7. ✅ Version bumped to 3.0.0
8. ✅ Integration tests with money operators
9. ✅ Full verification and git tag

**Breaking changes:**
- `createEngine()` requires `evaluator` or `operators` config
- `evaluateRule()` accepts evaluator parameter (internal API)

**New capabilities:**
- Custom operators work in rules (money_gt, money_between, etc)
- Full plugin system integration
- Extensible operator composition

**Next steps:**
Return to brainstorming the money library integration for complex money handling scenarios!
