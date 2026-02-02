# Fix Money Library Build and Add Comprehensive Tests

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix TypeScript declaration generation failure and achieve comprehensive test coverage for @f-o-t/money library

**Architecture:** Two-phase approach: (1) Investigate and fix the declaration generation memory issue by analyzing type complexity and simplifying where needed, (2) Add systematic test coverage for all modules following TDD principles with one test file per source module

**Tech Stack:** TypeScript 5.x, Bun test runner, Zod for schemas, @f-o-t/bigint for arithmetic

---

## Phase 1: Fix TypeScript Declaration Generation

### Context

The money library build fails during TypeScript declaration generation with exit code 134 (out of memory). This is a **pre-existing issue** (existed before @f-o-t/bigint migration). The library has:
- 7,644 lines of code
- Complex Zod schemas with type inference
- 10 operator definitions using `createOperator` from condition-evaluator
- Multiple type re-exports and circular-looking dependencies

Current state: 178 tests passing, runtime works perfectly, only declarations fail.

---

### Task 1: Investigate Type Complexity

**Files:**
- Read: `libraries/money/src/**/*.ts` (all TypeScript files)
- Analyze: Type inference chains, Zod schema complexity

**Step 1: Analyze Zod type inference usage**

Run: `cd libraries/money && grep -r "z.infer<" src/ --include="*.ts"`
Expected: List all places using Zod type inference

**Step 2: Check for circular type dependencies**

Run: `cd libraries/money && grep -r "import.*from.*\.\." src/ --include="*.ts" | grep -v node_modules`
Expected: Map out import graph to identify circular patterns

**Step 3: Identify type complexity hotspots**

Check these known complex areas:
- `src/operations/comparison.ts` - 10 operators with `createOperator()` calls
- `src/schemas.ts` - Multiple Zod schemas with refinements
- `src/index.ts` - Large number of re-exports

**Step 4: Document findings**

Create analysis doc: `docs/investigations/money-type-complexity-analysis.md`

Document:
- Number of `z.infer<>` usages
- Circular imports (if any)
- Most complex type definitions
- Estimated type instantiation depth

---

### Task 2: Add Explicit Type Annotations

**Files:**
- Modify: `libraries/money/src/operations/comparison.ts`

**Rationale:** Explicit return types reduce TypeScript's type inference work

**Step 1: Add explicit return type to createOperator calls**

Before:
```typescript
export const moneyEqualsOperator = createOperator({
   name: "money_eq",
   // ...
});
```

After:
```typescript
import type { Operator } from "@f-o-t/condition-evaluator";

export const moneyEqualsOperator: Operator = createOperator({
   name: "money_eq",
   // ...
});
```

**Step 2: Apply to all 10 operators**

Update these operators:
- `moneyEqualsOperator`
- `moneyNotEqualsOperator`
- `moneyGreaterThanOperator`
- `moneyGreaterThanOrEqualOperator`
- `moneyLessThanOperator`
- `moneyLessThanOrEqualOperator`
- `moneyBetweenOperator`
- `moneyPositiveOperator`
- `moneyNegativeOperator`
- `moneyZeroOperator`

**Step 3: Test build**

Run: `cd libraries/money && bun run build`
Expected: Check if declarations generate (may still fail, but progress)

**Step 4: Commit if improved**

```bash
git add libraries/money/src/operations/comparison.ts
git commit -m "fix(money): add explicit types to operators to reduce type inference"
```

---

### Task 3: Simplify Zod Schema Exports

**Files:**
- Modify: `libraries/money/src/schemas.ts`

**Step 1: Replace some z.infer with explicit types**

For simple schemas, use explicit types instead of inference:

Before:
```typescript
export const CurrencyCodeSchema = z.string()...
export type Currency = z.infer<typeof CurrencySchema>;
```

After:
```typescript
export const CurrencyCodeSchema = z.string()...

// Explicit type instead of inference
export type Currency = {
   code: string;
   numericCode: number;
   name: string;
   decimalPlaces: number;
   symbol?: string;
   subunitName?: string;
};

// Keep schema validation separate
export const CurrencySchema = z.object({...}).strict();
```

**Step 2: Apply to these types**

- `Currency` (already shown)
- `MoneyJSON`
- `DatabaseMoney`
- `MoneyInput`
- `FormatOptions`
- `AllocationRatios`

Keep `Money` type using `z.infer` because it has BigInt (special handling needed)

**Step 3: Test build**

Run: `cd libraries/money && bun run build`
Expected: Check if declarations generate

**Step 4: Run tests to verify no regressions**

Run: `cd libraries/money && bun test`
Expected: All 178 tests still passing

**Step 5: Commit**

```bash
git add libraries/money/src/schemas.ts
git commit -m "fix(money): use explicit types instead of z.infer for simple schemas

Reduces TypeScript type inference complexity during declaration generation."
```

---

### Task 4: Split Large Index File

**Files:**
- Read: `libraries/money/src/index.ts`
- Create: `libraries/money/src/exports/core.ts`
- Create: `libraries/money/src/exports/operations.ts`
- Create: `libraries/money/src/exports/formatting.ts`
- Create: `libraries/money/src/exports/serialization.ts`
- Modify: `libraries/money/src/index.ts`

**Rationale:** Large barrel files with many re-exports can cause type instantiation issues

**Step 1: Create exports/core.ts**

```typescript
// Core factory functions and types
export { of, fromMajorUnits, fromMinorUnits, ofRounded, zero } from "../core/money";
export { createMoney, minorUnitsToDecimal, parseDecimalToMinorUnits } from "../core/internal";
export { assertSameCurrency, assertAllSameCurrency } from "../core/assertions";
export { bankersRound, EXTENDED_PRECISION, PRECISION_FACTOR } from "../core/rounding";

export type { Money, RoundingMode } from "../types";
```

**Step 2: Create exports/operations.ts**

```typescript
// All operations
export { add, subtract, multiply, divide, percentage, negate, absolute } from "../operations/arithmetic";
export { compare, equals, greaterThan, greaterThanOrEqual, lessThan, lessThanOrEqual, isPositive, isNegative, isZero } from "../operations/comparison";
export { allocate, split } from "../operations/allocation";
export { sum, sumOrZero, average, min, max, median } from "../operations/aggregation";
```

**Step 3: Create exports/formatting.ts**

```typescript
// Formatting and parsing
export { format, formatCompact, formatAmount, toDecimal } from "../formatting/format";
export { parse } from "../formatting/parse";
```

**Step 4: Create exports/serialization.ts**

```typescript
// Serialization
export { toJSON, fromJSON, toDatabase, fromDatabase, serialize, deserialize } from "../serialization/json";
export { toMajorUnits, toMajorUnitsString, toMinorUnits, toMinorUnitsBigInt, toMinorUnitsString } from "../serialization/conversion";

export type { MoneyJSON, DatabaseMoney } from "../types";
```

**Step 5: Simplify src/index.ts**

```typescript
// Re-export from organized modules
export * from "./exports/core";
export * from "./exports/operations";
export * from "./exports/formatting";
export * from "./exports/serialization";

// Currency registry
export { getCurrency, hasCurrency, registerCurrency, clearCustomCurrencies, getAllCurrencies } from "./currency/registry";
export { ISO_4217_CURRENCIES } from "./currency/currencies";
export type { Currency } from "./currency/types";

// Schemas
export {
   MoneySchema,
   MoneyInputSchema,
   MoneyInternalSchema,
   CurrencyCodeSchema,
   CurrencySchema,
   DatabaseMoneySchema,
   FormatOptionsSchema,
   AllocationRatiosSchema,
   AmountStringSchema,
   type MoneyInput,
   type AllocationRatios,
   type CurrencyInput,
} from "./schemas";

// Errors
export {
   MoneyError,
   CurrencyMismatchError,
   InvalidAmountError,
   DivisionByZeroError,
   UnknownCurrencyError,
   OverflowError,
   ScaleMismatchError,
} from "./errors";

// Types
export type { FormatOptions } from "./types";
```

**Step 6: Test build**

Run: `cd libraries/money && bun run build`
Expected: Declarations should generate successfully

**Step 7: Run all tests**

Run: `cd libraries/money && bun test`
Expected: All 178 tests still passing

**Step 8: Commit**

```bash
git add libraries/money/src/exports/ libraries/money/src/index.ts
git commit -m "refactor(money): split index exports into organized modules

Reduces type complexity by breaking large barrel file into smaller chunks.
Improves TypeScript declaration generation performance."
```

---

### Task 5: Verify Build Works

**Files:**
- None (verification only)

**Step 1: Clean build**

Run: `cd libraries/money && rm -rf dist && bun run build`
Expected: Build succeeds with declarations generated

**Step 2: Verify declaration files exist**

Run: `cd libraries/money && ls -lh dist/*.d.ts`
Expected: All declaration files present

**Step 3: Verify exports work**

Create test file `verify-exports.ts`:
```typescript
import { of, format } from "./src/index";

const money = of("100.50", "USD");
console.log(format(money));
```

Run: `bun run verify-exports.ts`
Expected: Outputs "$100.50"

Delete: `rm verify-exports.ts`

**Step 4: Run tests one more time**

Run: `cd libraries/money && bun test`
Expected: All 178 tests passing

---

## Phase 2: Add Comprehensive Test Coverage

### Current State

Only 2 test files exist:
- `__tests__/money.test.ts` - Main functionality tests (178 tests across both files)
- `__tests__/rounding.test.ts` - Banker's rounding tests

Missing test coverage for:
- Individual modules (core, operations, formatting, serialization, currency)
- Edge cases
- Error conditions
- Schema validations

### Testing Standards

- One test file per source file
- Test filename mirrors source: `src/core/money.ts` → `__tests__/core/money.test.ts`
- Use TDD: Write failing test → Minimal implementation → Pass → Refactor
- Each test file structure:
  ```typescript
  describe("Module Name", () => {
    describe("functionName", () => {
      test("happy path description", () => { ... });
      test("edge case description", () => { ... });
      test("error case description", () => { ... });
    });
  });
  ```

---

### Task 6: Test Core/Internal Module

**Files:**
- Create: `libraries/money/__tests__/core/internal.test.ts`
- Reference: `libraries/money/src/core/internal.ts`

**Step 1: Create test file structure**

```typescript
import { describe, expect, test } from "bun:test";
import {
   createMoney,
   parseDecimalToMinorUnits,
   minorUnitsToDecimal,
   maxBigInt,
   minBigInt,
} from "../../src/core/internal";

describe("Core Internal Utilities", () => {
   // Tests will go here
});
```

**Step 2: Test createMoney**

```typescript
describe("createMoney", () => {
   test("creates frozen Money object with correct properties", () => {
      const money = createMoney(12345n, "USD", 2);

      expect(money.amount).toBe(12345n);
      expect(money.currency).toBe("USD");
      expect(money.scale).toBe(2);
      expect(Object.isFrozen(money)).toBe(true);
   });

   test("creates Money with zero amount", () => {
      const money = createMoney(0n, "EUR", 2);

      expect(money.amount).toBe(0n);
      expect(money.currency).toBe("EUR");
   });

   test("creates Money with negative amount", () => {
      const money = createMoney(-5000n, "JPY", 0);

      expect(money.amount).toBe(-5000n);
      expect(money.scale).toBe(0);
   });

   test("creates Money with different scales", () => {
      const usd = createMoney(100n, "USD", 2);
      const jpy = createMoney(100n, "JPY", 0);
      const bhd = createMoney(100n, "BHD", 3);

      expect(usd.scale).toBe(2);
      expect(jpy.scale).toBe(0);
      expect(bhd.scale).toBe(3);
   });
});
```

**Step 3: Test parseDecimalToMinorUnits**

```typescript
describe("parseDecimalToMinorUnits", () => {
   test("parses simple decimal to minor units", () => {
      expect(parseDecimalToMinorUnits("123.45", 2, "truncate")).toBe(12345n);
      expect(parseDecimalToMinorUnits("100", 2, "truncate")).toBe(10000n);
      expect(parseDecimalToMinorUnits("0.5", 2, "truncate")).toBe(50n);
   });

   test("parses negative decimals", () => {
      expect(parseDecimalToMinorUnits("-123.45", 2, "truncate")).toBe(-12345n);
      expect(parseDecimalToMinorUnits("-0.01", 2, "truncate")).toBe(-1n);
   });

   test("truncates excess decimal places", () => {
      expect(parseDecimalToMinorUnits("123.456", 2, "truncate")).toBe(12345n);
      expect(parseDecimalToMinorUnits("100.999", 2, "truncate")).toBe(10099n);
   });

   test("rounds excess decimal places with round mode", () => {
      expect(parseDecimalToMinorUnits("123.456", 2, "round")).toBe(12346n);
      expect(parseDecimalToMinorUnits("100.995", 2, "round")).toBe(10100n);
   });

   test("handles zero scale (no decimals)", () => {
      expect(parseDecimalToMinorUnits("123", 0, "truncate")).toBe(123n);
      expect(parseDecimalToMinorUnits("123.5", 0, "round")).toBe(124n);
   });

   test("handles high scale values", () => {
      expect(parseDecimalToMinorUnits("1.23456789", 8, "truncate")).toBe(123456789n);
   });

   test("pads missing decimal places", () => {
      expect(parseDecimalToMinorUnits("123.4", 2, "truncate")).toBe(12340n);
      expect(parseDecimalToMinorUnits("123", 2, "truncate")).toBe(12300n);
   });
});
```

**Step 4: Test minorUnitsToDecimal**

```typescript
describe("minorUnitsToDecimal", () => {
   test("converts minor units to decimal string", () => {
      expect(minorUnitsToDecimal(12345n, 2)).toBe("123.45");
      expect(minorUnitsToDecimal(10000n, 2)).toBe("100.00");
      expect(minorUnitsToDecimal(50n, 2)).toBe("0.50");
   });

   test("converts negative amounts", () => {
      expect(minorUnitsToDecimal(-12345n, 2)).toBe("-123.45");
      expect(minorUnitsToDecimal(-1n, 2)).toBe("-0.01");
   });

   test("converts zero", () => {
      expect(minorUnitsToDecimal(0n, 2)).toBe("0.00");
      expect(minorUnitsToDecimal(0n, 0)).toBe("0");
   });

   test("handles zero scale", () => {
      expect(minorUnitsToDecimal(123n, 0)).toBe("123");
   });

   test("preserves trailing zeros", () => {
      expect(minorUnitsToDecimal(10000n, 2)).toBe("100.00");
      expect(minorUnitsToDecimal(12300n, 2)).toBe("123.00");
   });

   test("handles high scale values", () => {
      expect(minorUnitsToDecimal(123456789n, 8)).toBe("1.23456789");
   });
});
```

**Step 5: Test maxBigInt and minBigInt**

```typescript
describe("maxBigInt", () => {
   test("returns larger of two positive values", () => {
      expect(maxBigInt(100n, 200n)).toBe(200n);
      expect(maxBigInt(200n, 100n)).toBe(200n);
   });

   test("returns larger when one is negative", () => {
      expect(maxBigInt(-100n, 200n)).toBe(200n);
      expect(maxBigInt(100n, -200n)).toBe(100n);
   });

   test("returns less negative of two negative values", () => {
      expect(maxBigInt(-100n, -200n)).toBe(-100n);
   });

   test("returns either value when equal", () => {
      expect(maxBigInt(100n, 100n)).toBe(100n);
   });
});

describe("minBigInt", () => {
   test("returns smaller of two positive values", () => {
      expect(minBigInt(100n, 200n)).toBe(100n);
      expect(minBigInt(200n, 100n)).toBe(100n);
   });

   test("returns smaller when one is negative", () => {
      expect(minBigInt(-100n, 200n)).toBe(-100n);
      expect(minBigInt(100n, -200n)).toBe(-200n);
   });

   test("returns more negative of two negative values", () => {
      expect(minBigInt(-100n, -200n)).toBe(-200n);
   });

   test("returns either value when equal", () => {
      expect(minBigInt(100n, 100n)).toBe(100n);
   });
});
```

**Step 6: Run tests**

Run: `cd libraries/money && bun test __tests__/core/internal.test.ts`
Expected: All new tests pass

**Step 7: Commit**

```bash
git add libraries/money/__tests__/core/internal.test.ts
git commit -m "test(money): add comprehensive tests for core/internal module

- Test createMoney object creation and immutability
- Test parseDecimalToMinorUnits with truncate/round modes
- Test minorUnitsToDecimal formatting
- Test maxBigInt/minBigInt helpers
- Cover edge cases: negatives, zero, high scale, padding"
```

---

### Task 7: Test Core/Assertions Module

**Files:**
- Create: `libraries/money/__tests__/core/assertions.test.ts`
- Reference: `libraries/money/src/core/assertions.ts`

**Step 1: Create test file**

```typescript
import { describe, expect, test } from "bun:test";
import { assertSameCurrency, assertAllSameCurrency } from "../../src/core/assertions";
import { createMoney } from "../../src/core/internal";
import { CurrencyMismatchError, ScaleMismatchError } from "../../src/errors";

describe("Core Assertions", () => {
   // Tests will go here
});
```

**Step 2: Test assertSameCurrency success cases**

```typescript
describe("assertSameCurrency", () => {
   test("passes when currencies match", () => {
      const a = createMoney(100n, "USD", 2);
      const b = createMoney(200n, "USD", 2);

      expect(() => assertSameCurrency(a, b)).not.toThrow();
   });

   test("passes when same currency different amounts", () => {
      const a = createMoney(0n, "EUR", 2);
      const b = createMoney(-500n, "EUR", 2);

      expect(() => assertSameCurrency(a, b)).not.toThrow();
   });

   test("throws CurrencyMismatchError when currencies differ", () => {
      const a = createMoney(100n, "USD", 2);
      const b = createMoney(100n, "EUR", 2);

      expect(() => assertSameCurrency(a, b)).toThrow(CurrencyMismatchError);
      expect(() => assertSameCurrency(a, b)).toThrow("Currency mismatch: USD vs EUR");
   });

   test("throws ScaleMismatchError when scales differ", () => {
      const a = createMoney(100n, "USD", 2);
      const b = createMoney(100n, "USD", 3);

      expect(() => assertSameCurrency(a, b)).toThrow(ScaleMismatchError);
      expect(() => assertSameCurrency(a, b)).toThrow("Scale mismatch");
   });

   test("handles zero-decimal currencies", () => {
      const a = createMoney(100n, "JPY", 0);
      const b = createMoney(200n, "JPY", 0);

      expect(() => assertSameCurrency(a, b)).not.toThrow();
   });
});
```

**Step 3: Test assertAllSameCurrency**

```typescript
describe("assertAllSameCurrency", () => {
   test("passes when all currencies match", () => {
      const values = [
         createMoney(100n, "USD", 2),
         createMoney(200n, "USD", 2),
         createMoney(-50n, "USD", 2),
      ];

      expect(() => assertAllSameCurrency(values)).not.toThrow();
   });

   test("passes with single value", () => {
      const values = [createMoney(100n, "USD", 2)];

      expect(() => assertAllSameCurrency(values)).not.toThrow();
   });

   test("throws when currencies differ", () => {
      const values = [
         createMoney(100n, "USD", 2),
         createMoney(200n, "EUR", 2),
         createMoney(300n, "USD", 2),
      ];

      expect(() => assertAllSameCurrency(values)).toThrow(CurrencyMismatchError);
   });

   test("throws when scales differ", () => {
      const values = [
         createMoney(100n, "USD", 2),
         createMoney(200n, "USD", 3),
      ];

      expect(() => assertAllSameCurrency(values)).toThrow(ScaleMismatchError);
   });

   test("throws with empty array", () => {
      expect(() => assertAllSameCurrency([])).toThrow();
      expect(() => assertAllSameCurrency([])).toThrow("Cannot assert currency on empty array");
   });

   test("handles large arrays", () => {
      const values = Array.from({ length: 100 }, (_, i) =>
         createMoney(BigInt(i), "EUR", 2)
      );

      expect(() => assertAllSameCurrency(values)).not.toThrow();
   });

   test("throws on first mismatch in large array", () => {
      const values = Array.from({ length: 100 }, (_, i) =>
         createMoney(BigInt(i), i === 50 ? "JPY" : "EUR", 2)
      );

      expect(() => assertAllSameCurrency(values)).toThrow(CurrencyMismatchError);
   });
});
```

**Step 4: Run tests**

Run: `cd libraries/money && bun test __tests__/core/assertions.test.ts`
Expected: All new tests pass

**Step 5: Commit**

```bash
git add libraries/money/__tests__/core/assertions.test.ts
git commit -m "test(money): add tests for core/assertions module

- Test assertSameCurrency with matching/mismatching currencies
- Test scale mismatch detection
- Test assertAllSameCurrency with arrays
- Cover edge cases: empty arrays, single values, large arrays"
```

---

### Task 8: Test Operations/Arithmetic Module

**Files:**
- Create: `libraries/money/__tests__/operations/arithmetic.test.ts`
- Reference: `libraries/money/src/operations/arithmetic.ts`

**Step 1: Create test file**

```typescript
import { describe, expect, test } from "bun:test";
import { add, subtract, multiply, divide, percentage, negate, absolute } from "../../src/operations/arithmetic";
import { of } from "../../src/core/money";
import { CurrencyMismatchError, DivisionByZeroError } from "../../src/errors";

describe("Arithmetic Operations", () => {
   // Tests will go here
});
```

**Step 2: Test add**

```typescript
describe("add", () => {
   test("adds two positive amounts", () => {
      const a = of("100.50", "USD");
      const b = of("50.25", "USD");
      const result = add(a, b);

      expect(result.amount).toBe(15075n); // 150.75 in cents
      expect(result.currency).toBe("USD");
   });

   test("adds positive and negative", () => {
      const a = of("100.00", "USD");
      const b = of("-30.00", "USD");
      const result = add(a, b);

      expect(result.amount).toBe(7000n); // 70.00
   });

   test("adds to zero", () => {
      const a = of("0.00", "USD");
      const b = of("25.50", "USD");
      const result = add(a, b);

      expect(result.amount).toBe(2550n);
   });

   test("throws on currency mismatch", () => {
      const a = of("100.00", "USD");
      const b = of("50.00", "EUR");

      expect(() => add(a, b)).toThrow(CurrencyMismatchError);
   });

   test("adds zero-decimal currencies", () => {
      const a = of("100", "JPY");
      const b = of("50", "JPY");
      const result = add(a, b);

      expect(result.amount).toBe(150n);
   });
});
```

**Step 3: Test subtract**

```typescript
describe("subtract", () => {
   test("subtracts two positive amounts", () => {
      const a = of("100.50", "USD");
      const b = of("50.25", "USD");
      const result = subtract(a, b);

      expect(result.amount).toBe(5025n); // 50.25
   });

   test("subtracts resulting in negative", () => {
      const a = of("50.00", "USD");
      const b = of("100.00", "USD");
      const result = subtract(a, b);

      expect(result.amount).toBe(-5000n); // -50.00
   });

   test("subtracts from zero", () => {
      const a = of("0.00", "USD");
      const b = of("25.50", "USD");
      const result = subtract(a, b);

      expect(result.amount).toBe(-2550n);
   });

   test("throws on currency mismatch", () => {
      const a = of("100.00", "USD");
      const b = of("50.00", "EUR");

      expect(() => subtract(a, b)).toThrow(CurrencyMismatchError);
   });
});
```

**Step 4: Test multiply**

```typescript
describe("multiply", () => {
   test("multiplies by positive number", () => {
      const money = of("100.50", "USD");
      const result = multiply(money, 2);

      expect(result.amount).toBe(20100n); // 201.00
   });

   test("multiplies by decimal", () => {
      const money = of("100.00", "USD");
      const result = multiply(money, 1.5);

      expect(result.amount).toBe(15000n); // 150.00
   });

   test("multiplies by string decimal for precision", () => {
      const money = of("100.00", "USD");
      const result = multiply(money, "1.5");

      expect(result.amount).toBe(15000n);
   });

   test("multiplies by zero", () => {
      const money = of("100.50", "USD");
      const result = multiply(money, 0);

      expect(result.amount).toBe(0n);
   });

   test("multiplies by negative", () => {
      const money = of("100.00", "USD");
      const result = multiply(money, -2);

      expect(result.amount).toBe(-20000n);
   });

   test("multiplies negative amount", () => {
      const money = of("-50.00", "USD");
      const result = multiply(money, 3);

      expect(result.amount).toBe(-15000n);
   });

   test("uses banker's rounding for fractional results", () => {
      const money = of("10.00", "USD");
      const result = multiply(money, 0.335); // Would be 3.35

      // Should round to nearest even (banker's rounding)
      expect(result.amount).toBe(334n); // 3.34 (rounds to even)
   });
});
```

**Step 5: Test divide**

```typescript
describe("divide", () => {
   test("divides by positive number", () => {
      const money = of("100.00", "USD");
      const result = divide(money, 2);

      expect(result.amount).toBe(5000n); // 50.00
   });

   test("divides by decimal", () => {
      const money = of("150.00", "USD");
      const result = divide(money, 1.5);

      expect(result.amount).toBe(10000n); // 100.00
   });

   test("divides by string for precision", () => {
      const money = of("150.00", "USD");
      const result = divide(money, "3");

      expect(result.amount).toBe(5000n); // 50.00
   });

   test("throws on division by zero", () => {
      const money = of("100.00", "USD");

      expect(() => divide(money, 0)).toThrow(DivisionByZeroError);
      expect(() => divide(money, "0")).toThrow(DivisionByZeroError);
   });

   test("divides negative amount", () => {
      const money = of("-100.00", "USD");
      const result = divide(money, 2);

      expect(result.amount).toBe(-5000n);
   });

   test("divides by negative divisor", () => {
      const money = of("100.00", "USD");
      const result = divide(money, -2);

      expect(result.amount).toBe(-5000n);
   });

   test("uses banker's rounding for fractional results", () => {
      const money = of("10.00", "USD");
      const result = divide(money, 3);

      // 10.00 / 3 = 3.333... → should round to 3.33
      expect(result.amount).toBe(333n);
   });
});
```

**Step 6: Test percentage, negate, absolute**

```typescript
describe("percentage", () => {
   test("calculates percentage of amount", () => {
      const money = of("100.00", "USD");
      const result = percentage(money, 15); // 15%

      expect(result.amount).toBe(1500n); // 15.00
   });

   test("calculates zero percentage", () => {
      const money = of("100.00", "USD");
      const result = percentage(money, 0);

      expect(result.amount).toBe(0n);
   });

   test("calculates 100 percentage", () => {
      const money = of("100.00", "USD");
      const result = percentage(money, 100);

      expect(result.amount).toBe(10000n); // 100.00
   });

   test("calculates decimal percentage", () => {
      const money = of("100.00", "USD");
      const result = percentage(money, 12.5);

      expect(result.amount).toBe(1250n); // 12.50
   });

   test("uses banker's rounding", () => {
      const money = of("100.00", "USD");
      const result = percentage(money, 33.33);

      expect(result.amount).toBe(3333n); // 33.33
   });
});

describe("negate", () => {
   test("negates positive amount", () => {
      const money = of("100.00", "USD");
      const result = negate(money);

      expect(result.amount).toBe(-10000n);
   });

   test("negates negative amount", () => {
      const money = of("-50.00", "USD");
      const result = negate(money);

      expect(result.amount).toBe(5000n);
   });

   test("negates zero", () => {
      const money = of("0.00", "USD");
      const result = negate(money);

      expect(result.amount).toBe(0n);
   });
});

describe("absolute", () => {
   test("returns absolute of positive amount", () => {
      const money = of("100.00", "USD");
      const result = absolute(money);

      expect(result.amount).toBe(10000n);
   });

   test("returns absolute of negative amount", () => {
      const money = of("-50.00", "USD");
      const result = absolute(money);

      expect(result.amount).toBe(5000n);
   });

   test("returns absolute of zero", () => {
      const money = of("0.00", "USD");
      const result = absolute(money);

      expect(result.amount).toBe(0n);
   });
});
```

**Step 7: Run tests**

Run: `cd libraries/money && bun test __tests__/operations/arithmetic.test.ts`
Expected: All new tests pass

**Step 8: Commit**

```bash
git add libraries/money/__tests__/operations/arithmetic.test.ts
git commit -m "test(money): add comprehensive tests for arithmetic operations

- Test add, subtract with positive/negative/zero values
- Test multiply, divide with numbers and strings
- Test division by zero error handling
- Test percentage, negate, absolute
- Verify banker's rounding in operations
- Cover currency mismatch errors"
```

---

### Task 9: Test Operations/Comparison Module

**Files:**
- Create: `libraries/money/__tests__/operations/comparison.test.ts`
- Reference: `libraries/money/src/operations/comparison.ts`

**Step 1: Create test file**

```typescript
import { describe, expect, test } from "bun:test";
import {
   compare,
   equals,
   greaterThan,
   greaterThanOrEqual,
   lessThan,
   lessThanOrEqual,
   isPositive,
   isNegative,
   isZero,
} from "../../src/operations/comparison";
import { of } from "../../src/core/money";
import { CurrencyMismatchError } from "../../src/errors";

describe("Comparison Operations", () => {
   // Tests will go here
});
```

**Step 2: Test compare**

```typescript
describe("compare", () => {
   test("returns 0 for equal amounts", () => {
      const a = of("100.00", "USD");
      const b = of("100.00", "USD");

      expect(compare(a, b)).toBe(0);
   });

   test("returns 1 when first is greater", () => {
      const a = of("100.00", "USD");
      const b = of("50.00", "USD");

      expect(compare(a, b)).toBe(1);
   });

   test("returns -1 when first is less", () => {
      const a = of("50.00", "USD");
      const b = of("100.00", "USD");

      expect(compare(a, b)).toBe(-1);
   });

   test("compares negative amounts", () => {
      const a = of("-50.00", "USD");
      const b = of("-100.00", "USD");

      expect(compare(a, b)).toBe(1); // -50 > -100
   });

   test("throws on currency mismatch", () => {
      const a = of("100.00", "USD");
      const b = of("100.00", "EUR");

      expect(() => compare(a, b)).toThrow(CurrencyMismatchError);
   });
});
```

**Step 3: Test equals and not equals**

```typescript
describe("equals", () => {
   test("returns true for equal amounts", () => {
      const a = of("100.00", "USD");
      const b = of("100.00", "USD");

      expect(equals(a, b)).toBe(true);
   });

   test("returns false for different amounts", () => {
      const a = of("100.00", "USD");
      const b = of("50.00", "USD");

      expect(equals(a, b)).toBe(false);
   });

   test("compares zero amounts", () => {
      const a = of("0.00", "USD");
      const b = of("0.00", "USD");

      expect(equals(a, b)).toBe(true);
   });

   test("compares negative amounts", () => {
      const a = of("-100.00", "USD");
      const b = of("-100.00", "USD");

      expect(equals(a, b)).toBe(true);
   });

   test("throws on currency mismatch", () => {
      const a = of("100.00", "USD");
      const b = of("100.00", "EUR");

      expect(() => equals(a, b)).toThrow(CurrencyMismatchError);
   });
});
```

**Step 4: Test comparison functions**

```typescript
describe("greaterThan", () => {
   test("returns true when first is greater", () => {
      const a = of("100.00", "USD");
      const b = of("50.00", "USD");

      expect(greaterThan(a, b)).toBe(true);
   });

   test("returns false when first is less", () => {
      const a = of("50.00", "USD");
      const b = of("100.00", "USD");

      expect(greaterThan(a, b)).toBe(false);
   });

   test("returns false when equal", () => {
      const a = of("100.00", "USD");
      const b = of("100.00", "USD");

      expect(greaterThan(a, b)).toBe(false);
   });
});

describe("greaterThanOrEqual", () => {
   test("returns true when first is greater", () => {
      const a = of("100.00", "USD");
      const b = of("50.00", "USD");

      expect(greaterThanOrEqual(a, b)).toBe(true);
   });

   test("returns true when equal", () => {
      const a = of("100.00", "USD");
      const b = of("100.00", "USD");

      expect(greaterThanOrEqual(a, b)).toBe(true);
   });

   test("returns false when first is less", () => {
      const a = of("50.00", "USD");
      const b = of("100.00", "USD");

      expect(greaterThanOrEqual(a, b)).toBe(false);
   });
});

describe("lessThan", () => {
   test("returns true when first is less", () => {
      const a = of("50.00", "USD");
      const b = of("100.00", "USD");

      expect(lessThan(a, b)).toBe(true);
   });

   test("returns false when first is greater", () => {
      const a = of("100.00", "USD");
      const b = of("50.00", "USD");

      expect(lessThan(a, b)).toBe(false);
   });

   test("returns false when equal", () => {
      const a = of("100.00", "USD");
      const b = of("100.00", "USD");

      expect(lessThan(a, b)).toBe(false);
   });
});

describe("lessThanOrEqual", () => {
   test("returns true when first is less", () => {
      const a = of("50.00", "USD");
      const b = of("100.00", "USD");

      expect(lessThanOrEqual(a, b)).toBe(true);
   });

   test("returns true when equal", () => {
      const a = of("100.00", "USD");
      const b = of("100.00", "USD");

      expect(lessThanOrEqual(a, b)).toBe(true);
   });

   test("returns false when first is greater", () => {
      const a = of("100.00", "USD");
      const b = of("50.00", "USD");

      expect(lessThanOrEqual(a, b)).toBe(false);
   });
});
```

**Step 5: Test state check functions**

```typescript
describe("isPositive", () => {
   test("returns true for positive amount", () => {
      const money = of("100.00", "USD");

      expect(isPositive(money)).toBe(true);
   });

   test("returns false for negative amount", () => {
      const money = of("-100.00", "USD");

      expect(isPositive(money)).toBe(false);
   });

   test("returns false for zero", () => {
      const money = of("0.00", "USD");

      expect(isPositive(money)).toBe(false);
   });
});

describe("isNegative", () => {
   test("returns true for negative amount", () => {
      const money = of("-100.00", "USD");

      expect(isNegative(money)).toBe(true);
   });

   test("returns false for positive amount", () => {
      const money = of("100.00", "USD");

      expect(isNegative(money)).toBe(false);
   });

   test("returns false for zero", () => {
      const money = of("0.00", "USD");

      expect(isNegative(money)).toBe(false);
   });
});

describe("isZero", () => {
   test("returns true for zero", () => {
      const money = of("0.00", "USD");

      expect(isZero(money)).toBe(true);
   });

   test("returns false for positive amount", () => {
      const money = of("100.00", "USD");

      expect(isZero(money)).toBe(false);
   });

   test("returns false for negative amount", () => {
      const money = of("-100.00", "USD");

      expect(isZero(money)).toBe(false);
   });
});
```

**Step 6: Run tests**

Run: `cd libraries/money && bun test __tests__/operations/comparison.test.ts`
Expected: All new tests pass

**Step 7: Commit**

```bash
git add libraries/money/__tests__/operations/comparison.test.ts
git commit -m "test(money): add comprehensive tests for comparison operations

- Test compare function (-1, 0, 1 results)
- Test equals with positive/negative/zero
- Test greaterThan, greaterThanOrEqual, lessThan, lessThanOrEqual
- Test isPositive, isNegative, isZero state checks
- Cover currency mismatch errors"
```

---

### Task 10: Test Remaining Modules

**Note:** Due to plan length, remaining test files follow same pattern. Create tests for:

**Files to create:**
- `__tests__/operations/allocation.test.ts` - Test `allocate()` and `split()`
- `__tests__/operations/aggregation.test.ts` - Test `sum()`, `average()`, `min()`, `max()`, `median()`
- `__tests__/formatting/format.test.ts` - Test `format()`, `formatCompact()`, `formatAmount()`, `toDecimal()`
- `__tests__/formatting/parse.test.ts` - Test `parse()` with various formats
- `__tests__/serialization/json.test.ts` - Test `toJSON()`, `fromJSON()`, `serialize()`, `deserialize()`
- `__tests__/serialization/conversion.test.ts` - Test `toMajorUnits()`, `toMinorUnits()`, etc.
- `__tests__/currency/registry.test.ts` - Test `getCurrency()`, `registerCurrency()`, etc.
- `__tests__/schemas.test.ts` - Test all Zod schemas validate correctly
- `__tests__/errors.test.ts` - Test all error classes

**Each test file should:**
1. Import relevant functions
2. Test happy paths
3. Test edge cases (zero, negative, large values)
4. Test error cases
5. Commit with descriptive message

**Follow TDD pattern:**
- Write test
- Run to see it pass (code already exists)
- If test fails, fix the test or code
- Commit

**Commit message template:**
```bash
git commit -m "test(money): add tests for [module-name]

- Test [function1] with [scenarios]
- Test [function2] with [scenarios]
- Cover edge cases: [list]"
```

---

### Task 11: Final Verification

**Files:**
- None (verification only)

**Step 1: Run full test suite**

Run: `cd libraries/money && bun test`
Expected: All tests pass (should be 300+ tests now)

**Step 2: Check test coverage**

Run: `cd libraries/money && bun test --coverage`
Expected: High coverage (aim for >90%)

**Step 3: Verify build still works**

Run: `cd libraries/money && bun run build`
Expected: Build succeeds with declarations

**Step 4: Update CHANGELOG**

Add entry to `libraries/money/CHANGELOG.md`:
```markdown
## [1.2.1] - 2026-02-01

### Fixed

- Fixed TypeScript declaration generation by reducing type complexity
- Split large index barrel file into organized export modules

### Changed

- Added explicit type annotations to operator definitions
- Replaced some Zod type inference with explicit types for better performance

### Added

- Comprehensive test coverage for all modules (300+ tests)
- Test files mirror source structure for easy navigation
```

**Step 5: Bump version**

Update `libraries/money/package.json`:
```json
{
  "version": "1.2.1"
}
```

**Step 6: Final commit**

```bash
git add libraries/money/CHANGELOG.md libraries/money/package.json
git commit -m "chore(money): release version 1.2.1

- Fixed TypeScript declaration generation
- Added comprehensive test coverage
- Improved type system performance"
```

---

## Success Criteria

- [ ] TypeScript declarations generate successfully without memory errors
- [ ] All existing 178 tests still passing
- [ ] Added 150+ new tests covering all modules
- [ ] Test coverage >90%
- [ ] Build completes in CI environment
- [ ] Version bumped to 1.2.1
- [ ] CHANGELOG updated

## Notes

- Build fix takes priority - tests can be added incrementally
- If type simplification doesn't work, may need to investigate TypeScript compiler options
- All tests should use Zod for validation where applicable
- Follow existing test patterns in `__tests__/money.test.ts` for consistency
