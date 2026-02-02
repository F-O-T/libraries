# Money Library Restructure Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the money library build failure (OOM during declaration generation) and fix condition-evaluator's package.json/CHANGELOG

**Architecture:** The build OOMs because `operations/comparison.ts` imports `createOperator` from `@f-o-t/condition-evaluator`, which has a different Zod copy (4.3.6 vs money's 4.3.4). TypeScript tries to reconcile Zod v4's deeply recursive generics across two installations, causing exponential type expansion. Fix: (1) move operators to their own plugin module, (2) fix Zod versions, (3) fix condition-evaluator's broken package.json version.

**Tech Stack:** TypeScript 5.5+, Bun, Zod v4, @f-o-t/bigint, @f-o-t/condition-evaluator

---

## Root Cause

Build runs `tsc` for `.d.ts` generation → OOMs at ~4GB (exit code 134):

1. `operations/comparison.ts` imports `createOperator` from `@f-o-t/condition-evaluator`
2. Money has Zod `4.3.4` installed, condition-evaluator has `4.3.6` — two separate copies at different paths
3. TypeScript must prove structural compatibility between `$ZodTypes` from both copies — Zod v4 internals are deeply recursive generics → exponential type expansion → OOM
4. `index.ts` re-exports from `operations/comparison.ts` → main entry point triggers the explosion

The previous plan (adding return types) would NOT fix this — `isolatedDeclarations` doesn't bypass type checking, and the OOM happens during type resolution, not declaration emit.

---

## Phase 1: Fix condition-evaluator Package

### Task 1: Fix condition-evaluator package.json version and add Zod dependency

**Files:**
- Modify: `libraries/condition-evaluator/package.json`

**Step 1: Read the current package.json**

Current state:
- `version`: `"0.1.0"` — WRONG, CHANGELOG shows `2.0.1`
- No `zod` in `dependencies` — WRONG, it imports from `"zod"` in 4 source files and marks it as `external` in fot.config.ts

**Step 2: Update package.json**

Fix the version to match CHANGELOG (`2.0.1`) and add `zod` as a runtime dependency:

```json
{
  "name": "@f-o-t/condition-evaluator",
  "version": "2.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "fot build",
    "test": "fot test",
    "lint": "fot lint",
    "format": "fot format",
    "typecheck": "fot typecheck"
  },
  "dependencies": {
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@f-o-t/cli": "workspace:*",
    "@f-o-t/config": "workspace:*"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/F-O-T/libraries.git",
    "directory": "libraries/condition-evaluator"
  }
}
```

**Step 3: Verify condition-evaluator still builds**

Run: `cd libraries/condition-evaluator && bun run build`
Expected: Build succeeds

**Step 4: Run condition-evaluator tests**

Run: `cd libraries/condition-evaluator && bun test`
Expected: All 345 tests pass

**Step 5: Commit**

```bash
git add libraries/condition-evaluator/package.json
git commit -m "fix(condition-evaluator): fix version and add zod dependency

Version was stuck at 0.1.0 despite CHANGELOG documenting up to 2.0.1.
Added zod ^4.3.6 as a runtime dependency (was missing despite being
imported in 4 source files and marked as external in fot.config.ts)."
```

---

### Task 2: Update condition-evaluator CHANGELOG

**Files:**
- Modify: `libraries/condition-evaluator/CHANGELOG.md`

**Step 1: Add entry for the fix**

Add a new section at the top (after line 7):

```markdown
## [2.0.2] - 2026-02-02

### Fixed

- Fixed package.json version (was `0.1.0`, now correctly `2.0.2`)
- Added missing `zod` runtime dependency to package.json
```

**Step 2: Update package.json version to 2.0.2**

Since we're making a fix release, bump from `2.0.1` to `2.0.2`:

Update `libraries/condition-evaluator/package.json`:
```json
"version": "2.0.2"
```

**Step 3: Commit**

```bash
git add libraries/condition-evaluator/CHANGELOG.md libraries/condition-evaluator/package.json
git commit -m "chore(condition-evaluator): release version 2.0.2

Fixed package.json version and added missing zod dependency."
```

---

## Phase 2: Decouple Operators from Money Comparison Module

### Task 3: Move operator definitions to plugins directory

**Files:**
- Modify: `libraries/money/src/operations/comparison.ts` (remove all operator code)
- Modify: `libraries/money/src/plugins/operators/index.ts` (move operator code here)

**Step 1: Rewrite `src/plugins/operators/index.ts` with the operator definitions**

Move all operator-related code here. This file gets its own bundled entry point via `plugins: ['operators']` in fot.config.ts, so it's built separately from the main library.

```typescript
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

function toJSON(money: Money): MoneyJSON {
   return {
      amount: minorUnitsToDecimal(money.amount, money.scale),
      currency: money.currency,
   };
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
```

**Step 2: Strip `comparison.ts` down to pure comparison functions only**

Remove everything from line 1 to line 218 (all operator code, the `toMoney` helper, the `toJSON` export, and the imports for `createOperator`, `z`, `minorUnitsToDecimal`, `of`, `MoneySchema`, `MoneyJSON`).

The file should become:

```typescript
import { assertSameCurrency } from "../core/assertions";
import type { Money } from "../schemas";

export function equals(a: Money, b: Money): boolean {
   assertSameCurrency(a, b);
   return a.amount === b.amount;
}

export function greaterThan(a: Money, b: Money): boolean {
   assertSameCurrency(a, b);
   return a.amount > b.amount;
}

export function greaterThanOrEqual(a: Money, b: Money): boolean {
   assertSameCurrency(a, b);
   return a.amount >= b.amount;
}

export function lessThan(a: Money, b: Money): boolean {
   assertSameCurrency(a, b);
   return a.amount < b.amount;
}

export function lessThanOrEqual(a: Money, b: Money): boolean {
   assertSameCurrency(a, b);
   return a.amount <= b.amount;
}

export function isPositive(money: Money): boolean {
   return money.amount > 0n;
}

export function isNegative(money: Money): boolean {
   return money.amount < 0n;
}

export function isZero(money: Money): boolean {
   return money.amount === 0n;
}

export function compare(a: Money, b: Money): -1 | 0 | 1 {
   assertSameCurrency(a, b);
   if (a.amount < b.amount) return -1;
   if (a.amount > b.amount) return 1;
   return 0;
}
```

**Step 3: Verify no condition-evaluator imports in main src/**

Run: `grep -r "condition-evaluator" libraries/money/src/ --include="*.ts" | grep -v "plugins/"`
Expected: No matches

**Step 4: Run tests**

Run: `cd libraries/money && bun test`
Expected: All 178 tests pass

**Step 5: Commit**

```bash
git add libraries/money/src/operations/comparison.ts libraries/money/src/plugins/operators/index.ts
git commit -m "refactor(money): move operators to plugins directory

Decouple condition-evaluator operators from comparison functions.
The main library no longer imports @f-o-t/condition-evaluator,
eliminating the Zod type compatibility check that caused OOM
during declaration generation."
```

---

## Phase 3: Fix Zod Version Alignment

### Task 4: Align Zod versions across workspace

**Files:**
- Possibly: `bun.lock` (auto-updated by bun install)

**Step 1: Reinstall dependencies**

Run: `cd /home/yorizel/Documents/fot-libraries && bun install`
Expected: Zod resolves to same version everywhere

**Step 2: Verify alignment**

Run: `cat libraries/money/node_modules/zod/package.json | grep version && cat libraries/condition-evaluator/node_modules/zod/package.json | grep version`
Expected: Both show `4.3.6`

**Step 3: Commit lockfile if changed**

```bash
git add bun.lock
git commit -m "fix: align Zod versions across workspace"
```

---

## Phase 4: Update Money Package Config

### Task 5: Add condition-evaluator as optional peerDependency

**Files:**
- Modify: `libraries/money/package.json`

**Step 1: Add peerDependencies section**

The condition-evaluator is only needed for the operators plugin. Add:

```json
{
  "peerDependencies": {
    "@f-o-t/condition-evaluator": "^2.0.0"
  },
  "peerDependenciesMeta": {
    "@f-o-t/condition-evaluator": {
      "optional": true
    }
  }
}
```

**Step 2: Commit**

```bash
git add libraries/money/package.json
git commit -m "fix(money): make condition-evaluator an optional peer dependency

Only needed for the operators plugin, not for core money operations."
```

---

## Phase 5: Build and Verify

### Task 6: Test the build

**Files:**
- None (verification only)

**Step 1: Clean build**

Run: `cd libraries/money && rm -rf dist && bun run build`
Expected: Build succeeds — main entry point no longer pulls in condition-evaluator types.

**Step 2: Verify declaration files exist**

Run: `ls libraries/money/dist/*.d.ts && ls libraries/money/dist/plugins/operators/*.d.ts`
Expected: Both main and plugin declarations present

**Step 3: Run full test suite**

Run: `cd libraries/money && bun test`
Expected: All tests pass

**Step 4: Verify operators plugin works**

Run:
```bash
cd libraries/money && bun -e "
import { moneyEqualsOperator } from './src/plugins/operators/index.ts';
console.log('Operator:', moneyEqualsOperator.name, moneyEqualsOperator.type);
"
```
Expected: Prints `Operator: money_eq custom`

---

### Task 7: Simplify fot.config.ts if possible

**Files:**
- Possibly modify: `libraries/money/fot.config.ts`

**Step 1: Check if maxMemory is still needed**

The build should now work without the 8GB override. If Task 6 succeeded, update:

```typescript
import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
   external: ['zod', '@f-o-t/condition-evaluator', '@f-o-t/bigint'],
   plugins: ['operators'],
   typescript: {
      isolatedDeclarations: true,
   },
});
```

Keep `isolatedDeclarations: true` (good practice). Remove `maxMemory: 8192` (no longer needed).

**Step 2: Verify build still works without maxMemory**

Run: `cd libraries/money && rm -rf dist && bun run build`
Expected: Succeeds

**Step 3: Commit if changed**

```bash
git add libraries/money/fot.config.ts
git commit -m "chore(money): remove maxMemory workaround

Declaration generation no longer OOMs after decoupling operators."
```

---

### Task 8: Update money CHANGELOG and version

**Files:**
- Modify: `libraries/money/CHANGELOG.md`
- Modify: `libraries/money/package.json`

**Step 1: Add CHANGELOG entry**

Add new version section:

```markdown
## [1.2.1] - 2026-02-02

### Fixed

- Fixed TypeScript declaration generation OOM (exit code 134) by decoupling operators from comparison module
- Root cause: duplicate Zod installations caused exponential type expansion during structural compatibility checks

### Changed

- Moved condition-evaluator operators from `operations/comparison.ts` to `plugins/operators/`
- Made `@f-o-t/condition-evaluator` an optional peer dependency
- Main library no longer imports from `@f-o-t/condition-evaluator`
- Removed 8GB `maxMemory` workaround from build config
```

**Step 2: Bump version to 1.2.1**

Update `libraries/money/package.json`: `"version": "1.2.1"`

**Step 3: Commit**

```bash
git add libraries/money/CHANGELOG.md libraries/money/package.json
git commit -m "chore(money): release version 1.2.1

Fixed declaration generation OOM by decoupling operators plugin.
Condition-evaluator is now an optional peer dependency."
```

---

## Success Criteria

- [ ] condition-evaluator package.json version matches CHANGELOG (`2.0.2`)
- [ ] condition-evaluator has `zod: "^4.3.6"` in dependencies
- [ ] Money build succeeds without OOM (`bun run build` exits 0)
- [ ] Declaration files generated for both main and plugin entry points
- [ ] All money tests pass (178 tests)
- [ ] All condition-evaluator tests pass (345 tests)
- [ ] Main money library has zero imports from `@f-o-t/condition-evaluator`
- [ ] Operators plugin still works via `@f-o-t/money/plugins/operators`
- [ ] `condition-evaluator` is an optional peer dependency of money
- [ ] Both CHANGELOGs updated, both versions bumped
