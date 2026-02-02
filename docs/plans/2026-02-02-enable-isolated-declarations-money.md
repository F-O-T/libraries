# Enable Isolated Declarations for Money Library

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable TypeScript's isolatedDeclarations mode for the @f-o-t/money library to fix declaration generation performance issues

**Architecture:** Two-phase approach: (1) Enable isolatedDeclarations in config/CLI infrastructure, (2) Add explicit return type annotations to all exported functions in money library to meet isolatedDeclarations requirements

**Tech Stack:** TypeScript 5.5+, Bun, @f-o-t/config, @f-o-t/cli

---

## Context

The money library's TypeScript declaration generation fails due to complex type inference (millions of type compatibility checks). IsolatedDeclarations mode compiles 10-100x faster by requiring explicit type annotations, eliminating expensive type inference.

**Current State:**
- `isolatedDeclarations` option already exists in config types but not wired up
- Money library has 81 exported functions/constants without explicit return types
- Build fails at declaration generation with timeout
- All 178 tests passing, runtime works perfectly

**Requirements:**
- Enable isolatedDeclarations in config/CLI
- Add explicit return types to all exports
- Prefer using types from Zod schemas and internal libraries where applicable
- Maintain backward compatibility

---

## Phase 1: Enable isolatedDeclarations in Config/CLI

### Task 1: Update Config Schema

**Files:**
- Modify: `libraries/config/src/schemas.ts`
- Modify: `libraries/config/src/generators/tsconfig.ts`

**Step 1: Verify isolatedDeclarations in schema**

Check that `libraries/config/src/schemas.ts` already has:
```typescript
export const typeScriptOptionsSchema = z
   .object({
      declaration: z.boolean().default(true),
      isolatedDeclarations: z.boolean().default(false),
      maxMemory: z.number().int().positive().optional(),
   })
   .default({ declaration: true, isolatedDeclarations: false });
```

Expected: Already present (added in previous work)

**Step 2: Verify tsconfig generator uses the option**

Check that `libraries/config/src/generators/tsconfig.ts` line ~41 has:
```typescript
isolatedDeclarations: config.typescript.isolatedDeclarations,
```

Expected: Already present

**Step 3: Test config change**

Run: `cd libraries/config && bun test`
Expected: Tests pass (or skip if config has no tests)

**Step 4: No commit needed**

Config infrastructure is already complete from previous work.

---

### Task 2: Enable isolatedDeclarations in Money Library Config

**Files:**
- Modify: `libraries/money/fot.config.ts`

**Step 1: Add isolatedDeclarations option**

Update `libraries/money/fot.config.ts`:
```typescript
import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
	external: ['zod', '@f-o-t/condition-evaluator', '@f-o-t/bigint'],
	plugins: ['operators'],
	typescript: {
		maxMemory: 8192,
		isolatedDeclarations: true, // Enable isolated declarations mode
	},
});
```

**Step 2: Test configuration loads**

Run: `cd libraries/money && node -e "console.log(require('./fot.config.ts').default)"`
Expected: Config loads without errors

**Step 3: Try build (will fail)**

Run: `cd libraries/money && bun run build`
Expected: Build FAILS with errors about missing type annotations

The error messages will show which functions need explicit return types. This is expected - we'll fix these in Phase 2.

**Step 4: Commit configuration change**

```bash
git add libraries/money/fot.config.ts
git commit -m "feat(money): enable isolatedDeclarations mode

Enable TypeScript's isolatedDeclarations for faster declaration generation.
This requires explicit return type annotations on all exports (to be added).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Add Explicit Type Annotations

### Strategy

Add explicit return types to all exported functions. Prioritize using:
1. **Zod schema types** (e.g., `Money`, `Currency`, `MoneyJSON`)
2. **Internal library types** (e.g., types from @f-o-t/bigint)
3. **Primitive types** (string, number, boolean, bigint)
4. **Array/Object types** with explicit structure

---

### Task 3: Add Types to Core Module

**Files:**
- Modify: `libraries/money/src/core/money.ts`
- Modify: `libraries/money/src/core/internal.ts`
- Modify: `libraries/money/src/core/assertions.ts`

**Step 1: Add return types to core/money.ts**

```typescript
import type { Money, RoundingMode } from "../schemas";

export function of(amount: string | number, currency: string): Money {
   // ... existing implementation
}

export function fromMajorUnits(amount: string | number, currency: string): Money {
   // ... existing implementation
}

export function fromMinorUnits(amount: bigint, currency: string): Money {
   // ... existing implementation
}

export function ofRounded(amount: string | number, currency: string): Money {
   // ... existing implementation
}

export function zero(currency: string): Money {
   // ... existing implementation
}
```

**Step 2: Add return types to core/internal.ts**

```typescript
import type { Money, RoundingMode } from "../schemas";

export function createMoney(amount: bigint, currency: string, scale: number): Money {
   // ... existing implementation
}

export function parseDecimalToMinorUnits(
   amountStr: string,
   scale: number,
   roundingMode: RoundingMode = "truncate",
): bigint {
   // ... existing implementation
}

export function minorUnitsToDecimal(amount: bigint, scale: number): string {
   // ... existing implementation
}

export function maxBigInt(a: bigint, b: bigint): bigint {
   // ... existing implementation
}

export function minBigInt(a: bigint, b: bigint): bigint {
   // ... existing implementation
}
```

**Step 3: Add return types to core/assertions.ts**

```typescript
import type { Money } from "../schemas";

export function assertSameCurrency(a: Money, b: Money): void {
   // ... existing implementation
}

export function assertAllSameCurrency(values: readonly Money[]): void {
   // ... existing implementation
}
```

**Step 4: Test build progress**

Run: `cd libraries/money && bun run build 2>&1 | grep -i error | head -20`
Expected: Fewer errors than before, showing remaining files

**Step 5: Run tests**

Run: `cd libraries/money && bun test`
Expected: All 178 tests still passing

**Step 6: Commit**

```bash
git add libraries/money/src/core/
git commit -m "fix(money): add explicit return types to core modules

Add return type annotations to core/money, core/internal, core/assertions
for isolatedDeclarations compatibility. Use Money type from schemas.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Add Types to Operations Modules

**Files:**
- Modify: `libraries/money/src/operations/arithmetic.ts`
- Modify: `libraries/money/src/operations/comparison.ts`
- Modify: `libraries/money/src/operations/allocation.ts`
- Modify: `libraries/money/src/operations/aggregation.ts`

**Step 1: Add return types to operations/arithmetic.ts**

```typescript
import type { Money } from "../schemas";

export function add(a: Money, b: Money): Money {
   // ... existing implementation
}

export function subtract(a: Money, b: Money): Money {
   // ... existing implementation
}

export function multiply(money: Money, multiplier: number | string): Money {
   // ... existing implementation
}

export function divide(money: Money, divisor: number | string): Money {
   // ... existing implementation
}

export function percentage(money: Money, percent: number): Money {
   // ... existing implementation
}

export function negate(money: Money): Money {
   // ... existing implementation
}

export function absolute(money: Money): Money {
   // ... existing implementation
}
```

**Step 2: Add return types to operations/comparison.ts**

Note: Operators already have `: Operator` type from previous work.

```typescript
import type { Money } from "../schemas";

export function compare(a: Money, b: Money): number {
   // ... existing implementation
}

export function equals(a: Money, b: Money): boolean {
   // ... existing implementation
}

export function greaterThan(a: Money, b: Money): boolean {
   // ... existing implementation
}

export function greaterThanOrEqual(a: Money, b: Money): boolean {
   // ... existing implementation
}

export function lessThan(a: Money, b: Money): boolean {
   // ... existing implementation
}

export function lessThanOrEqual(a: Money, b: Money): boolean {
   // ... existing implementation
}

export function isPositive(money: Money): boolean {
   // ... existing implementation
}

export function isNegative(money: Money): boolean {
   // ... existing implementation
}

export function isZero(money: Money): boolean {
   // ... existing implementation
}
```

**Step 3: Add return types to operations/allocation.ts**

```typescript
import type { Money, AllocationRatios } from "../schemas";

export function allocate(money: Money, ratios: AllocationRatios): Money[] {
   // ... existing implementation
}

export function split(money: Money, parts: number): Money[] {
   // ... existing implementation
}
```

**Step 4: Add return types to operations/aggregation.ts**

```typescript
import type { Money } from "../schemas";

export function sum(values: readonly Money[]): Money {
   // ... existing implementation
}

export function sumOrZero(values: readonly Money[], defaultCurrency?: string): Money {
   // ... existing implementation
}

export function average(values: readonly Money[]): Money {
   // ... existing implementation
}

export function min(values: readonly Money[]): Money {
   // ... existing implementation
}

export function max(values: readonly Money[]): Money {
   // ... existing implementation
}

export function median(values: readonly Money[]): Money {
   // ... existing implementation
}
```

**Step 5: Test build progress**

Run: `cd libraries/money && bun run build 2>&1 | grep -i error | head -20`
Expected: Even fewer errors, showing remaining files

**Step 6: Run tests**

Run: `cd libraries/money && bun test`
Expected: All 178 tests still passing

**Step 7: Commit**

```bash
git add libraries/money/src/operations/
git commit -m "fix(money): add explicit return types to operations modules

Add return type annotations to arithmetic, comparison, allocation, aggregation
for isolatedDeclarations compatibility.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Add Types to Formatting Modules

**Files:**
- Modify: `libraries/money/src/formatting/format.ts`
- Modify: `libraries/money/src/formatting/parse.ts`

**Step 1: Add return types to formatting/format.ts**

```typescript
import type { Money, FormatOptions } from "../schemas";

export function format(money: Money, options?: FormatOptions): string {
   // ... existing implementation
}

export function formatCompact(money: Money, options?: FormatOptions): string {
   // ... existing implementation
}

export function formatAmount(money: Money, options?: FormatOptions): string {
   // ... existing implementation
}

export function toDecimal(money: Money): string {
   // ... existing implementation
}
```

**Step 2: Add return types to formatting/parse.ts**

```typescript
import type { Money } from "../schemas";

export function parse(amountStr: string, currency: string, locale?: string): Money {
   // ... existing implementation
}
```

**Step 3: Test build progress**

Run: `cd libraries/money && bun run build 2>&1 | grep -i error | head -20`
Expected: Getting close to zero errors

**Step 4: Run tests**

Run: `cd libraries/money && bun test`
Expected: All 178 tests still passing

**Step 5: Commit**

```bash
git add libraries/money/src/formatting/
git commit -m "fix(money): add explicit return types to formatting modules

Add return type annotations to format and parse functions
for isolatedDeclarations compatibility.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Add Types to Serialization Modules

**Files:**
- Modify: `libraries/money/src/serialization/json.ts`
- Modify: `libraries/money/src/serialization/conversion.ts`

**Step 1: Add return types to serialization/json.ts**

```typescript
import type { Money, MoneyJSON, DatabaseMoney } from "../schemas";

export function toJSON(money: Money): MoneyJSON {
   // ... existing implementation
}

export function fromJSON(json: MoneyJSON): Money {
   // ... existing implementation
}

export function serialize(money: Money): string {
   // ... existing implementation
}

export function deserialize(serialized: string): Money {
   // ... existing implementation
}

export function toDatabase(money: Money): DatabaseMoney {
   // ... existing implementation
}

export function fromDatabase(data: DatabaseMoney): Money {
   // ... existing implementation
}
```

**Step 2: Add return types to serialization/conversion.ts**

```typescript
import type { Money } from "../schemas";

export function toMinorUnits(money: Money): number {
   // ... existing implementation
}

export function toMinorUnitsBigInt(money: Money): bigint {
   // ... existing implementation
}

export function toMinorUnitsString(money: Money): string {
   // ... existing implementation
}

export function toMajorUnits(money: Money): number {
   // ... existing implementation
}

export function toMajorUnitsString(money: Money): string {
   // ... existing implementation
}
```

**Step 3: Test build progress**

Run: `cd libraries/money && bun run build 2>&1 | grep -i error | head -20`
Expected: Very few or zero errors remaining

**Step 4: Run tests**

Run: `cd libraries/money && bun test`
Expected: All 178 tests still passing

**Step 5: Commit**

```bash
git add libraries/money/src/serialization/
git commit -m "fix(money): add explicit return types to serialization modules

Add return type annotations to json and conversion functions
for isolatedDeclarations compatibility.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Add Types to Currency Module

**Files:**
- Modify: `libraries/money/src/currency/registry.ts`

**Step 1: Add return types to registry functions**

```typescript
import type { Currency } from "../schemas";

export function getCurrency(code: string): Currency {
   // ... existing implementation
}

export function hasCurrency(code: string): boolean {
   // ... existing implementation
}

export function registerCurrency(currency: Currency): void {
   // ... existing implementation
}

export function clearCustomCurrencies(): void {
   // ... existing implementation
}

export function getAllCurrencies(): Currency[] {
   // ... existing implementation
}
```

**Step 2: Test build**

Run: `cd libraries/money && bun run build 2>&1 | grep -i error`
Expected: No errors (or minimal remaining)

**Step 3: Run tests**

Run: `cd libraries/money && bun test`
Expected: All 178 tests still passing

**Step 4: Commit**

```bash
git add libraries/money/src/currency/
git commit -m "fix(money): add explicit return types to currency registry

Add return type annotations to currency registry functions
for isolatedDeclarations compatibility.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Add Types to Export Modules

**Files:**
- Verify: `libraries/money/src/exports/*.ts` (should inherit types from imports)

**Step 1: Check export modules**

The export modules use `export { }` and `export type { }` syntax which automatically inherits the types from the source modules. No changes needed unless build shows errors.

Run: `cd libraries/money && bun run build`
Expected: Build should succeed now, or show any remaining issues

**Step 2: If errors remain, check which exports need explicit types**

Look for any `export const` declarations in export files that might need types.

**Step 3: No commit needed unless changes made**

---

### Task 9: Final Build Verification

**Files:**
- None (verification only)

**Step 1: Clean build**

Run: `cd libraries/money && rm -rf dist && bun run build`
Expected: Build succeeds completely with declarations generated

Output should show:
```
$ fot build
Loading fot.config.ts...
Building 2 entry point(s)...
Building esm format...
✓ esm format built successfully
Build completed successfully!
Generating TypeScript declarations...
✓ TypeScript declarations generated
```

**Step 2: Verify declaration files**

Run: `cd libraries/money && ls -lh dist/*.d.ts | wc -l`
Expected: Multiple `.d.ts` files present

Run: `cd libraries/money && ls -lh dist/*.d.ts`
Expected: Shows declaration files for main exports and plugins

**Step 3: Test declarations are usable**

Create test file `verify-types.ts`:
```typescript
import { of, add, format, type Money } from "./src/index";

const money1: Money = of("100.50", "USD");
const money2: Money = of("50.25", "USD");
const result: Money = add(money1, money2);
const formatted: string = format(result);

console.log(formatted); // Should output: $150.75
```

Run: `bun run verify-types.ts`
Expected: No type errors, outputs "$150.75"

Delete: `rm verify-types.ts`

**Step 4: Run full test suite**

Run: `cd libraries/money && bun test`
Expected: All 178 tests still passing

**Step 5: Check build time**

Run: `cd libraries/money && time bun run build`
Expected: Build completes in <10 seconds (should be much faster than before)

---

### Task 10: Update CHANGELOG and Version

**Files:**
- Modify: `libraries/money/CHANGELOG.md`
- Modify: `libraries/money/package.json`

**Step 1: Add CHANGELOG entry**

Add to top of `libraries/money/CHANGELOG.md` (after line 7):
```markdown
## [1.2.1] - 2026-02-02

### Fixed

- Fixed TypeScript declaration generation by enabling isolatedDeclarations mode
- Added explicit return type annotations to all exported functions (~80 functions)
- Reduced declaration generation time from timeout (>60s) to <10s

### Changed

- Enabled `isolatedDeclarations: true` in TypeScript configuration
- All exports now have explicit type annotations for better type safety

### Technical

- TypeScript declaration generation now 10-100x faster
- Uses isolatedDeclarations mode which eliminates expensive type inference
- Compatible with TypeScript 5.5+
```

**Step 2: Update version**

Update `libraries/money/package.json`:
```json
{
  "version": "1.2.1"
}
```

**Step 3: Commit**

```bash
git add libraries/money/CHANGELOG.md libraries/money/package.json
git commit -m "chore(money): release version 1.2.1

Fixed TypeScript declaration generation by enabling isolatedDeclarations.
Added explicit return types to all exports.
Build time reduced from timeout to <10 seconds.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria

- [ ] isolatedDeclarations enabled in money library config
- [ ] All ~80 exported functions have explicit return type annotations
- [ ] TypeScript declarations generate successfully
- [ ] Build completes in <10 seconds (down from timeout)
- [ ] All 178 tests still passing
- [ ] Declaration files are usable and provide correct types
- [ ] Version bumped to 1.2.1
- [ ] CHANGELOG updated

## Notes

- **Type Preference**: Use Zod schema types (Money, Currency, etc.) first, then internal library types, then primitives
- **No Breaking Changes**: This is an internal refactor - all public APIs maintain same signatures
- **Build Performance**: isolatedDeclarations should reduce build time by 10-100x
- **TypeScript Version**: Requires TypeScript 5.5+ for isolatedDeclarations support
- **Backward Compatibility**: Libraries can still be used with older TypeScript versions (just won't get the perf benefit)

## Rollback Plan

If issues arise:
1. Set `isolatedDeclarations: false` in `fot.config.ts`
2. Revert to previous commit
3. Return types can stay (they're good practice anyway)
