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
