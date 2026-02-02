# Migrate @f-o-t/uom to @f-o-t/bigint

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor `@f-o-t/uom` to use `@f-o-t/bigint` utilities, eliminating duplicate bigint handling code while maintaining backward compatibility.

**Architecture:** Replace internal precision utilities with @f-o-t/bigint imports, keeping all public APIs unchanged through thin wrapper functions.

**Tech Stack:** @f-o-t/bigint ^1.0.0, existing uom library dependencies

---

## Benefits

- **Single source of truth** - All bigint operations standardized across FOT libraries
- **Consistent behavior** - Same rounding modes, parsing logic, and formatting rules as money library
- **Reduced maintenance** - No duplicate code to maintain and test
- **Better tested** - Benefit from bigint's comprehensive test suite (242 tests)
- **Future-proof** - Easy to add condition-evaluator operators if needed

## Pre-Migration Checklist

- [ ] @f-o-t/bigint version 1.0.0 is published/available in workspace
- [ ] @f-o-t/money migration is complete (recommended to do money first)
- [ ] All uom tests are passing (baseline)
- [ ] Current uom version noted for rollback: `0.1.0`

## Migration Tasks

### Task 1: Add @f-o-t/bigint Dependency

**Files:**
- Modify: `libraries/uom/package.json`

**Step 1: Add dependency**

Update `libraries/uom/package.json`:
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
git add libraries/uom/package.json bun.lock
git commit -m "feat(uom): add @f-o-t/bigint dependency

Preparing to migrate internal bigint utilities to use @f-o-t/bigint"
```

---

### Task 2: Migrate parseDecimalToBigInt

**Files:**
- Modify: `libraries/uom/src/utils/precision.ts`

**Step 1: Add import**

At top of `libraries/uom/src/utils/precision.ts`, add:
```typescript
import { parseToBigInt as parseToBigIntCore } from "@f-o-t/bigint";
```

**Step 2: Replace implementation**

Replace the current `parseDecimalToBigInt` function with a thin wrapper:
```typescript
/**
 * Parse a decimal number (string or number) to BigInt with specified scale
 *
 * @param value - The numeric value as string or number
 * @param scale - The number of decimal places to preserve
 * @returns BigInt representation with the specified precision
 *
 * @example
 * ```typescript
 * parseDecimalToBigInt("10.5", 12)  // 10500000000000n
 * parseDecimalToBigInt(25.75, 12)   // 25750000000000n
 * parseDecimalToBigInt("100", 6)    // 100000000n
 * ```
 */
export function parseDecimalToBigInt(
   value: number | string,
   scale: number,
): bigint {
   return parseToBigIntCore({
      value: String(value),
      scale,
      roundingMode: "truncate", // UOM uses truncate as default
   });
}
```

**Step 3: Run tests**

Run: `cd libraries/uom && bun test`
Expected: All tests PASS (no regressions)

**Step 4: Commit**

```bash
git add libraries/uom/src/utils/precision.ts
git commit -m "refactor(uom): use @f-o-t/bigint for parseDecimalToBigInt

Replace internal parsing implementation with parseToBigInt from @f-o-t/bigint.
Maintains exact same behavior and API."
```

---

### Task 3: Migrate formatBigIntToDecimal

**Files:**
- Modify: `libraries/uom/src/utils/precision.ts`

**Step 1: Add import**

Update import at top of file:
```typescript
import {
   parseToBigInt as parseToBigIntCore,
   formatFromBigInt,
} from "@f-o-t/bigint";
```

**Step 2: Replace implementation**

Replace the current `formatBigIntToDecimal` function with a thin wrapper:
```typescript
/**
 * Format a BigInt value to a decimal string with specified scale
 *
 * @param value - The BigInt value
 * @param scale - The number of decimal places
 * @returns String representation as decimal number
 *
 * @example
 * ```typescript
 * formatBigIntToDecimal(10500000000000n, 12)  // "10.5"
 * formatBigIntToDecimal(25750000000000n, 12)  // "25.75"
 * formatBigIntToDecimal(100000000n, 6)        // "100"
 * ```
 */
export function formatBigIntToDecimal(value: bigint, scale: number): string {
   return formatFromBigInt({
      value,
      scale,
      trimTrailingZeros: true, // UOM trims trailing zeros by default
   });
}
```

**Step 3: Run tests**

Run: `cd libraries/uom && bun test`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add libraries/uom/src/utils/precision.ts
git commit -m "refactor(uom): use @f-o-t/bigint for formatBigIntToDecimal

Replace internal formatting implementation with formatFromBigInt.
Maintains exact same behavior and API."
```

---

### Task 4: Remove PRECISION_SCALE Duplication (Optional)

**Files:**
- Modify: `libraries/uom/src/utils/precision.ts`

**Step 1: Evaluate if PRECISION_SCALE is still needed**

Check if `PRECISION_SCALE` constant (line 7) is used elsewhere in the codebase:
```bash
grep -r "PRECISION_SCALE" libraries/uom/src/
```

If it's only used in precision.ts and can be replaced:

```typescript
// Remove: export const PRECISION_SCALE = 12;
// Users of this constant should now use the scale parameter directly
```

If it's used elsewhere, keep it but add a comment:
```typescript
/**
 * Default precision scale (12 decimal places)
 * Provides sufficient precision for most scientific and financial calculations
 *
 * Note: Internal parsing and formatting now use @f-o-t/bigint
 */
export const PRECISION_SCALE = 12;
```

**Step 2: Update any imports if constant was removed**

Search and update files that import PRECISION_SCALE if it was removed.

**Step 3: Run tests**

Run: `cd libraries/uom && bun test`
Expected: All tests PASS

**Step 4: Commit (if changes made)**

```bash
git add libraries/uom/src/utils/precision.ts
git commit -m "refactor(uom): update PRECISION_SCALE documentation

Note that internal operations now use @f-o-t/bigint."
```

---

### Task 5: Update CHANGELOG

**Files:**
- Modify: `libraries/uom/CHANGELOG.md`

**Step 1: Add new version entry**

Add to top of `libraries/uom/CHANGELOG.md`:
```markdown
## [0.2.0] - 2026-02-01

### Changed

- **Internal refactor**: Migrated to `@f-o-t/bigint` ^1.0.0 for bigint operations
  - `parseDecimalToBigInt` now uses `parseToBigInt` from @f-o-t/bigint
  - `formatBigIntToDecimal` now uses `formatFromBigInt` from @f-o-t/bigint
- **Note**: This is an internal refactor with no breaking changes to public APIs
- **Benefit**: Standardized bigint operations across all FOT libraries
- **Behavior**: Maintains exact same parsing and formatting behavior

### Dependencies

- Added `@f-o-t/bigint` ^1.0.0

[0.2.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/uom@0.2.0
```

**Step 2: Update package version**

Update `libraries/uom/package.json`:
```json
{
  "version": "0.2.0"
}
```

**Step 3: Commit**

```bash
git add libraries/uom/CHANGELOG.md libraries/uom/package.json
git commit -m "chore(uom): release version 0.2.0

Update CHANGELOG with bigint migration details.
Bump version to 0.2.0 for internal refactor release."
```

---

### Task 6: Final Verification

**Files:**
- None (verification only)

**Step 1: Run full test suite**

Run: `cd libraries/uom && bun test`
Expected: All tests PASS with same count as before migration

**Step 2: Run type checking**

Run: `cd libraries/uom && bun run typecheck`
Expected: No type errors

**Step 3: Build verification**

Run: `cd libraries/uom && bun run build`
Expected: Clean build with no errors

**Step 4: Compare output formats**

Create quick verification script `libraries/uom/verify-migration.ts`:
```typescript
import { createMeasurement, formatMeasurement } from "./src/index";

// Test parsing
const measurement = createMeasurement(10.5, "kg");
console.log("Created:", measurement);

// Test formatting
const formatted = formatMeasurement(measurement);
console.log("Formatted:", formatted);

// Test precision
const precise = createMeasurement(123.456789012345, "m");
console.log("Precise:", precise);
```

Run: `bun run verify-migration.ts`
Expected: Output matches pre-migration behavior

Delete: `rm verify-migration.ts`

**Step 5: Remove duplicate code verification**

Verify no duplicate implementations remain:
```bash
grep -r "padEnd\|padStart.*scale" libraries/uom/src/utils/precision.ts
```
Expected: Only finds imports and wrapper functions, not implementations

**Step 6: Final commit (if any cleanup needed)**

```bash
git add .
git commit -m "chore(uom): cleanup after bigint migration

Remove any remaining duplicate code or comments."
```

---

## Testing Checklist

After completing all tasks, verify:

- [x] All uom tests pass (same count as before)
- [x] No type errors
- [x] Build succeeds
- [x] Parsing produces identical output
- [x] Formatting produces identical output
- [x] Precision is maintained (12 decimal places)
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
   cd libraries/uom && bun test
   ```

4. **Investigate differences**
   - Compare bigint function behavior with old implementation
   - Check for edge cases in bigint library
   - Document discrepancies

5. **Fix @f-o-t/bigint if needed**
   - Create issue in bigint library
   - Fix and release new version (1.0.1)
   - Retry migration with fixed version

## Notes

- **No breaking changes** - This is an internal refactor only
- **Backward compatible** - All public APIs maintain exact same signatures
- **Wrapper functions** - Keep uom-specific function names for domain clarity
- **Domain logic preserved** - Unit conversion and measurement-specific logic unchanged
- **Dependency is bundled** - @f-o-t/bigint should not be in `external` array in fot.config.ts
- **Tests are critical** - Run full test suite after each task to catch regressions early
- **Migrate money first** - Recommended to complete money migration before uom for learning
- **Simpler than money** - UOM has fewer functions to migrate (only 2 main functions)
