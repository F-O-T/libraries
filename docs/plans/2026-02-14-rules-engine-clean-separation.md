# Rules Engine Clean Separation Refactor

**Date:** 2026-02-14
**Status:** Design Approved
**Version Impact:** MAJOR (breaking changes)

## Overview

Refactor `@f-o-t/rules-engine` to establish clean separation of concerns from `@f-o-t/condition-evaluator`. Rules-engine should focus purely on rule orchestration, not re-export condition evaluation primitives.

## Problem

Current issues:
- Rules-engine re-exports `createOperator`, `createEvaluator`, and condition types from condition-evaluator
- Creates confusion about which package owns what functionality
- Users might use rules-engine for condition evaluation without needing rules
- Blurs the architectural boundary between the two libraries

## Architecture

### Clean Separation of Concerns

**condition-evaluator ownership:**
- Condition evaluation logic
- Built-in operators (string, number, date, boolean, array)
- `createOperator()` function
- `createEvaluator()` function
- Condition types and schemas

**rules-engine ownership:**
- Rule orchestration (evaluation, caching, validation, versioning, simulation)
- Rule management (add, update, remove, filter, sort, group)
- Consequence aggregation
- Rule builder APIs
- Rule analysis and optimization

**Relationship:**
- Rules-engine **uses** condition-evaluator internally
- Rules-engine **does not re-export** condition-evaluator primitives
- Users import from the appropriate package for their needs

### Dual API Preserved

Both convenience and advanced APIs remain supported:

```typescript
// Approach 1: Pass operators (convenience)
import { createEngine } from "@f-o-t/rules-engine";
import { moneyOperators } from "@f-o-t/money/plugins/operators";

const engine = createEngine({
  consequences: {...},
  operators: moneyOperators, // Engine creates evaluator internally
});
```

```typescript
// Approach 2: Pass evaluator (advanced)
import { createEngine } from "@f-o-t/rules-engine";
import { createEvaluator } from "@f-o-t/condition-evaluator";

const evaluator = createEvaluator({ operators: {...} });
const engine = createEngine({
  consequences: {...},
  evaluator, // User provides evaluator
});
```

### Import Guidelines

**Import from condition-evaluator:**
- Creating custom operators → `createOperator()`
- Creating custom evaluators → `createEvaluator()`
- Condition types → `Condition`, `ConditionGroup`, etc.
- Operator types → `StringOperator`, `NumberOperator`, etc.

**Import from rules-engine:**
- Creating engines → `createEngine()`
- Building rules → `rule()`, `and()`, `or()`, `num()`, `str()`, etc.
- Rule management → `addRule()`, `updateRule()`, etc.
- Rule utilities → `validateRule()`, `simulate()`, etc.

## Changes Required

### 1. Remove Re-exports from `src/index.ts`

Remove lines 1-24:
```typescript
export type {
   ArrayCondition,
   BooleanCondition,
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
   createEvaluator,
   createOperator,
} from "@f-o-t/condition-evaluator";
```

### 2. Update Internal Imports

- Verify all internal files import directly from `@f-o-t/condition-evaluator` where needed
- Check for barrel exports that might be re-exporting condition-evaluator types
- Ensure no circular dependencies introduced

### 3. Update `package.json`

Keep `@f-o-t/condition-evaluator` as regular dependency:
```json
"dependencies": {
  "zod": "^4.3.6",
  "@f-o-t/condition-evaluator": "^2.0.6"
}
```

### 4. Update README

Add migration guide and clarify import paths:

**What breaks:**
```typescript
// ❌ BEFORE (will break)
import {
  createOperator,
  createEvaluator,
  Condition,
  ConditionGroup
} from "@f-o-t/rules-engine";

// ✅ AFTER (correct)
import {
  createOperator,
  createEvaluator,
  Condition,
  ConditionGroup
} from "@f-o-t/condition-evaluator";

import { createEngine } from "@f-o-t/rules-engine";
```

**What still works:**
```typescript
// ✅ All rule-related APIs unchanged
import {
  createEngine,
  rule,
  and, or, all, any,
  num, str, bool, date, arr,
  validateRule,
  simulate,
  // ... all other rule-engine APIs
} from "@f-o-t/rules-engine";
```

### 5. Update CHANGELOG

Document as breaking change:

```markdown
## [3.0.0] - YYYY-MM-DD

### BREAKING CHANGES

- **Removed re-exports from condition-evaluator**: `createOperator`, `createEvaluator`, and condition types are no longer exported from `@f-o-t/rules-engine`
- **Migration**: Import condition-evaluator primitives directly from `@f-o-t/condition-evaluator` instead of `@f-o-t/rules-engine`
- **Impact**: Users creating custom operators or using condition types must update imports

### Changed

- Rules-engine now focuses purely on rule orchestration
- Cleaner separation of concerns between rules-engine and condition-evaluator
- Both convenience (operators) and advanced (evaluator) APIs still supported
```

## Migration Guide for Users

### Step 1: Identify Breaking Imports

Find all imports from `@f-o-t/rules-engine` in your codebase.

### Step 2: Split Imports

Move condition-evaluator primitives to their own import:

```typescript
// Before
import {
  createEngine,
  createOperator,
  Condition
} from "@f-o-t/rules-engine";

// After
import { createOperator, Condition } from "@f-o-t/condition-evaluator";
import { createEngine } from "@f-o-t/rules-engine";
```

### Step 3: Update package.json

If creating custom operators, add dependency:
```json
"dependencies": {
  "@f-o-t/condition-evaluator": "^2.0.6",
  "@f-o-t/rules-engine": "^3.0.0"
}
```

### Step 4: Verify Build

```bash
bun install
bun run build
bun test
```

## Testing & Verification

### 1. Update Test Imports

Check all test files for imports that need updating:

```typescript
// Update __tests__/*.test.ts
// ❌ OLD
import { createEvaluator } from "@f-o-t/rules-engine";

// ✅ NEW
import { createEvaluator } from "@f-o-t/condition-evaluator";
```

### 2. Verify Dual API

Ensure both approaches still work:

```typescript
// Test 1: operators API (convenience)
test("engine accepts operators directly", () => {
  const engine = createEngine({
    consequences: {...},
    operators: { custom_op: myOperator }
  });
  // verify it works
});

// Test 2: evaluator API (advanced)
test("engine accepts evaluator", () => {
  const evaluator = createEvaluator({ operators: {...} });
  const engine = createEngine({
    consequences: {...},
    evaluator
  });
  // verify it works
});
```

### 3. Verify Exports

Confirm condition-evaluator types are NOT exported:

```typescript
// This should fail after refactor:
import { createOperator } from "@f-o-t/rules-engine"; // Type error
```

### 4. Run Full Test Suite

```bash
cd libraries/rules-engine
bun test
```

### 5. Check Integration Tests

Verify `__tests__/money-integration.test.ts` still works with money operators.

## Implementation Checklist

- [ ] Remove re-exports from `src/index.ts`
- [ ] Update internal imports (if any)
- [ ] Verify `package.json` dependencies
- [ ] Update test imports
- [ ] Add dual API tests
- [ ] Verify exports with TypeScript
- [ ] Run full test suite
- [ ] Update README with migration guide
- [ ] Update CHANGELOG with breaking changes
- [ ] Version bump to 3.0.0 in package.json

## Success Criteria

1. No re-exports from condition-evaluator in rules-engine
2. Both `operators` and `evaluator` APIs work in createEngine
3. All existing tests pass
4. TypeScript compilation succeeds
5. README clearly documents import paths
6. CHANGELOG documents breaking changes
7. Migration path is clear for users

## Risks & Mitigations

**Risk:** Users break on upgrade
**Mitigation:** Clear migration guide in CHANGELOG and README, major version bump signals breaking change

**Risk:** Missing internal imports
**Mitigation:** TypeScript will catch any missing imports during build

**Risk:** Reduced discoverability
**Mitigation:** README examples show both packages and when to use each

## Future Considerations

- This establishes a pattern for clean package boundaries
- Other libraries should follow similar separation principles
- Consider documenting architectural guidelines in root CLAUDE.md
