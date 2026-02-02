# Migrate @f-o-t/money to @f-o-t/bigint

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor `@f-o-t/money` to use `@f-o-t/bigint` utilities, eliminating duplicate bigint handling code while maintaining backward compatibility.

**Architecture:** Replace internal bigint utilities with @f-o-t/bigint imports, keeping all public APIs unchanged through thin wrapper functions.

**Tech Stack:** @f-o-t/bigint ^1.0.0, existing money library dependencies

---

## Benefits

- **Single source of truth** - All bigint operations standardized across FOT libraries
- **Consistent behavior** - Same rounding modes, parsing logic, and formatting rules
- **Reduced maintenance** - No duplicate code to maintain and test
- **Shared operators** - Leverage condition-evaluator operators from bigint library
- **Better tested** - Benefit from bigint's comprehensive test suite (242 tests)

## Pre-Migration Checklist

- [ ] @f-o-t/bigint version 1.0.0 is published/available in workspace
- [ ] All money tests are passing (baseline)
- [ ] Current money version noted for rollback: `0.1.0`

## Migration Tasks

### Task 1: Add @f-o-t/bigint Dependency

**Files:**
- Modify: `libraries/money/package.json`

**Step 1: Add dependency**

Update `libraries/money/package.json`:
```json
{
  "dependencies": {
    "@f-o-t/bigint": "^1.0.0",
    "zod": "^4.3.6"
  }
}
```

**Step 2: Install dependencies**

Run: `bun install`

**Step 3: Verify installation**

Run: `bun pm ls | grep bigint`
Expected: Shows @f-o-t/bigint@1.0.0

**Step 4: Commit**

```bash
git add libraries/money/package.json bun.lock
git commit -m "feat(money): add @f-o-t/bigint dependency

Preparing to migrate internal bigint utilities to use @f-o-t/bigint"
```

---

### Task 2: Migrate parseDecimalToMinorUnits

**Files:**
- Modify: `libraries/money/src/core/internal.ts`

**Step 1: Add import**

At top of `libraries/money/src/core/internal.ts`, add:
```typescript
import { parseToBigInt } from "@f-o-t/bigint";
```

**Step 2: Replace implementation**

Replace the current `parseDecimalToMinorUnits` function (lines 28-73) with:
```typescript
/**
 * Parse a decimal string to minor units
 *
 * @param amountStr - Decimal string (e.g., "123.45", "100", "-50.5")
 * @param scale - Target scale (decimal places)
 * @param roundingMode - How to handle excess decimal places (default: "truncate")
 * @returns Amount in minor units as BigInt
 */
export function parseDecimalToMinorUnits(
   amountStr: string,
   scale: number,
   roundingMode: RoundingMode = "truncate",
): bigint {
   return parseToBigInt({ value: amountStr, scale, roundingMode });
}
```

**Step 3: Run tests**

Run: `cd libraries/money && bun test`
Expected: All tests PASS (no regressions)

**Step 4: Commit**

```bash
git add libraries/money/src/core/internal.ts
git commit -m "refactor(money): use @f-o-t/bigint for parseDecimalToMinorUnits

Replace internal parsing implementation with parseToBigInt from @f-o-t/bigint.
Maintains exact same behavior and API."
```

---

### Task 3: Migrate minorUnitsToDecimal

**Files:**
- Modify: `libraries/money/src/core/internal.ts`

**Step 1: Add import**

Update import at top of file:
```typescript
import { parseToBigInt, formatFromBigInt } from "@f-o-t/bigint";
```

**Step 2: Replace implementation**

Replace the current `minorUnitsToDecimal` function (lines 82-96) with:
```typescript
/**
 * Convert minor units to decimal string
 *
 * @param amount - Amount in minor units
 * @param scale - Number of decimal places
 * @returns Decimal string representation
 */
export function minorUnitsToDecimal(amount: bigint, scale: number): string {
   return formatFromBigInt({ value: amount, scale, trimTrailingZeros: false });
}
```

**Step 3: Run tests**

Run: `cd libraries/money && bun test`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add libraries/money/src/core/internal.ts
git commit -m "refactor(money): use @f-o-t/bigint for minorUnitsToDecimal

Replace internal formatting implementation with formatFromBigInt.
Maintains exact same behavior and API."
```

---

### Task 4: Migrate bankersRound

**Files:**
- Modify: `libraries/money/src/core/rounding.ts`

**Step 1: Replace bankersRound implementation**

Replace the current `bankersRound` function (lines 21-61) with import:
```typescript
import { bankersRound } from "@f-o-t/bigint";

export { bankersRound };
```

**Step 2: Run tests**

Run: `cd libraries/money && bun test`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add libraries/money/src/core/rounding.ts
git commit -m "refactor(money): use @f-o-t/bigint for bankersRound

Replace internal banker's rounding implementation with @f-o-t/bigint.
Maintains exact same behavior."
```

---

### Task 5: Migrate roundToScale

**Files:**
- Modify: `libraries/money/src/core/rounding.ts`

**Step 1: Add import**

Update import at top of file:
```typescript
import { bankersRound, convertScale } from "@f-o-t/bigint";
```

**Step 2: Replace implementation**

Replace the current `roundToScale` function (lines 71-85) with:
```typescript
/**
 * Round a bigint value with extended precision back to a target scale
 *
 * @param value - Value with extended precision
 * @param fromScale - Current scale (precision) of the value
 * @param toScale - Target scale (currency's decimal places)
 * @returns Rounded value at target scale
 */
export function roundToScale(
   value: bigint,
   fromScale: number,
   toScale: number,
): bigint {
   return convertScale({
      value,
      fromScale,
      toScale,
      roundingMode: "round", // Use banker's rounding
   });
}
```

**Step 3: Run tests**

Run: `cd libraries/money && bun test`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add libraries/money/src/core/rounding.ts
git commit -m "refactor(money): use @f-o-t/bigint for roundToScale

Replace internal scale conversion with convertScale from @f-o-t/bigint.
Uses banker's rounding for precision."
```

---

### Task 6: Update CHANGELOG

**Files:**
- Modify: `libraries/money/CHANGELOG.md`

**Step 1: Add new version entry**

Add to top of `libraries/money/CHANGELOG.md`:
```markdown
## [0.2.0] - 2026-02-01

### Changed

- **Internal refactor**: Migrated to `@f-o-t/bigint` ^1.0.0 for bigint operations
  - `parseDecimalToMinorUnits` now uses `parseToBigInt` from @f-o-t/bigint
  - `minorUnitsToDecimal` now uses `formatFromBigInt` from @f-o-t/bigint
  - `bankersRound` now imported from @f-o-t/bigint
  - `roundToScale` now uses `convertScale` from @f-o-t/bigint
- **Note**: This is an internal refactor with no breaking changes to public APIs
- **Benefit**: Standardized bigint operations across all FOT libraries

### Dependencies

- Added `@f-o-t/bigint` ^1.0.0

[0.2.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/money@0.2.0
```

**Step 2: Update package version**

Update `libraries/money/package.json`:
```json
{
  "version": "0.2.0"
}
```

**Step 3: Commit**

```bash
git add libraries/money/CHANGELOG.md libraries/money/package.json
git commit -m "chore(money): release version 0.2.0

Update CHANGELOG with bigint migration details.
Bump version to 0.2.0 for internal refactor release."
```

---

### Task 7: Final Verification

**Files:**
- None (verification only)

**Step 1: Run full test suite**

Run: `cd libraries/money && bun test`
Expected: All tests PASS with same count as before migration

**Step 2: Run type checking**

Run: `cd libraries/money && bun run typecheck`
Expected: No type errors

**Step 3: Build verification**

Run: `cd libraries/money && bun run build`
Expected: Clean build with no errors

**Step 4: Compare output formats**

Create quick verification script `libraries/money/verify-migration.ts`:
```typescript
import { parseMoney, formatMoney } from "./src/index";

// Test parsing
const money = parseMoney("123.45", "USD");
console.log("Parsed:", money);

// Test formatting
const formatted = formatMoney(money);
console.log("Formatted:", formatted);

// Test rounding
const money2 = parseMoney("10.505", "USD"); // Should round to 10.50 or 10.51
console.log("Rounded:", money2);
```

Run: `bun run verify-migration.ts`
Expected: Output matches pre-migration behavior

Delete: `rm verify-migration.ts`

**Step 5: Remove duplicate code**

The old implementations are now replaced. Verify no duplicate functions remain:
```bash
grep -r "parseDecimalToBigInt\|formatBigIntToDecimal" libraries/money/src/
```
Expected: Only finds the wrapper functions, not implementations

**Step 6: Final commit (if any cleanup needed)**

```bash
git add .
git commit -m "chore(money): cleanup after bigint migration

Remove any remaining duplicate code or comments."
```

---

## Testing Checklist

After completing all tasks, verify:

- [x] All money tests pass (same count as before)
- [x] No type errors
- [x] Build succeeds
- [x] Parsing produces identical output
- [x] Formatting produces identical output
- [x] Rounding behavior is identical (banker's rounding)
- [x] No duplicate bigint utility code remains
- [x] CHANGELOG updated
- [x] Version bumped to 0.2.0

## Rollback Plan

If critical issues are found after migration:

1. **Revert all commits**
   ```bash
   git revert <migration-commit-sha>..HEAD
   ```

2. **Reinstall dependencies**
   ```bash
   bun install
   ```

3. **Verify rollback**
   ```bash
   cd libraries/money && bun test
   ```

4. **Investigate differences**
   - Compare bigint function behavior
   - Check for edge cases in bigint library
   - Document discrepancies

5. **Fix @f-o-t/bigint if needed**
   - Create issue in bigint library
   - Fix and release new version
   - Retry migration with fixed version

## Notes

- **No breaking changes** - This is an internal refactor only
- **Backward compatible** - All public APIs maintain exact same signatures
- **Wrapper functions** - Keep money-specific function names for clarity
- **Domain logic preserved** - Currency handling and money-specific errors unchanged
- **Dependency is bundled** - @f-o-t/bigint should not be in `external` array in fot.config.ts
- **Tests are critical** - Run full test suite after each task to catch regressions early
