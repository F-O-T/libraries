# Migrate Money and UOM Libraries to @f-o-t/bigint

## Goal

Refactor `@f-o-t/money` and `@f-o-t/uom` to use `@f-o-t/bigint` utilities, eliminating duplicate bigint handling code.

## Benefits

- Single source of truth for bigint operations
- Consistent behavior across all libraries
- Reduced maintenance burden
- Shared condition-evaluator patterns

## Migration Strategy

### Phase 1: Money Library

1. Add `@f-o-t/bigint` dependency to money's package.json
2. Update `money/src/core/internal.ts`:
   - Replace `parseDecimalToMinorUnits` implementation with `parseToBigInt`
   - Replace `minorUnitsToDecimal` implementation with `formatFromBigInt`
   - Keep function signatures unchanged (thin wrappers)
3. Update `money/src/core/rounding.ts`:
   - Replace `bankersRound` implementation with import from `@f-o-t/bigint`
   - Replace `roundToScale` implementation with `convertScale`
4. Run all money tests to verify no regressions
5. Remove duplicate code

### Phase 2: UOM Library

1. Add `@f-o-t/bigint` dependency to uom's package.json
2. Update `uom/src/utils/precision.ts`:
   - Replace `parseDecimalToBigInt` implementation with `parseToBigInt`
   - Replace `formatBigIntToDecimal` implementation with `formatFromBigInt`
   - Keep function signatures unchanged (thin wrappers)
3. Run all uom tests to verify no regressions
4. Remove duplicate code

### Phase 3: Documentation

1. Update money CHANGELOG noting internal refactor
2. Update uom CHANGELOG noting internal refactor
3. Update root README mentioning bigint library

## Testing Checklist

- [ ] All money tests pass
- [ ] All uom tests pass
- [ ] Money formatting produces identical output
- [ ] UOM formatting produces identical output
- [ ] Rounding behavior is identical
- [ ] Performance is acceptable

## Rollback Plan

If issues are found:
1. Revert commits for affected library
2. Investigate differences
3. Fix bigint library if needed
4. Retry migration

## Notes

- This is an **internal refactor** - no breaking changes to public APIs
- Function wrappers maintain backward compatibility
- Domain libraries keep their error handling
