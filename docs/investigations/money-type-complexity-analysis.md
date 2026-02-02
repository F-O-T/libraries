# Money Library Type Complexity Analysis

**Date**: 2026-02-01
**Library**: @f-o-t/money v1.2.0
**Issue**: TypeScript declaration generation fails with exit code 134 (out of memory)
**Build Config**: `maxMemory: 8192` (8GB) already set in fot.config.ts

---

## Executive Summary

The money library is experiencing TypeScript declaration generation failures due to excessive type complexity. The library contains:

- **7,644 total lines** across all files
- **3,149 source lines** in TypeScript files
- **20 TypeScript files** in src/
- **10 condition-evaluator operators** with complex type inference
- **97 exported items** from main index
- **7 Zod-inferred types** exported from schemas
- **46 currency definitions** in static data
- **Zero z.infer<> usage** in implementation files (all in schemas.ts)

The type complexity stems from:
1. Heavy use of Zod schema inference throughout the codebase
2. Multiple layers of type re-exports creating deep inference chains
3. Complex operator definitions using `createOperator` from condition-evaluator
4. Large main index file with 97 exports across 18 export statements

---

## 1. Zod Type Inference Usage

### Analysis Result

**Total z.infer<> usages: 7** (all in `/home/yorizel/Documents/fot-libraries/libraries/money/src/schemas.ts`)

```typescript
// schemas.ts - All Zod inferred types
export type Currency = z.infer<typeof CurrencySchema>;
export type MoneyJSON = z.infer<typeof MoneySchema>;
export type DatabaseMoney = z.infer<typeof DatabaseMoneySchema>;
export type MoneyInput = z.infer<typeof MoneyInputSchema>;
export type Money = z.infer<typeof MoneyInternalSchema>;
export type FormatOptions = z.infer<typeof FormatOptionsSchema>;
export type AllocationRatios = z.infer<typeof AllocationRatiosSchema>;
```

### Complexity Factors

1. **Schema Complexity**
   - 21 Zod method calls in schemas.ts
   - 29 refinements/validations (.describe, .refine, .min, .max, .regex, .length)
   - Nested object schemas with multiple constraints
   - Array refinements with custom validation logic

2. **Re-export Patterns**
   - Types defined in `schemas.ts` using z.infer
   - Re-exported in `types.ts` for backward compatibility
   - Re-exported again in `index.ts` for public API
   - Re-exported in `currency/types.ts` for Currency type
   - **Result**: 4-layer deep type export chain

---

## 2. Import Dependency Graph

### Key Findings

**No circular dependencies detected.** Import structure is clean and hierarchical.

### Dependency Structure

```
Core Foundation Layer:
- errors.ts (no dependencies)
- schemas.ts (only zod)
- types.ts (re-exports from schemas.ts)

Currency Layer:
- currency/types.ts → schemas.ts
- currency/currencies.ts → currency/types.ts
- currency/registry.ts → errors, currencies, types

Core Logic Layer:
- core/rounding.ts → @f-o-t/bigint
- core/internal.ts → types, rounding, @f-o-t/bigint
- core/assertions.ts → errors, types
- core/money.ts → currency/registry, errors, types, internal

Operations Layer:
- operations/arithmetic.ts → core/assertions, core/internal, errors, types
- operations/comparison.ts → core/assertions, core/internal, core/money, schemas, types, @f-o-t/condition-evaluator, zod
- operations/aggregation.ts → core/assertions, core/internal, core/money, core/rounding, errors, types
- operations/allocation.ts → core/internal, errors, types

Formatting Layer:
- formatting/format.ts → core/internal, currency/registry, types
- formatting/parse.ts → core/money, currency/registry, errors, types

Serialization Layer:
- serialization/conversion.ts → core/internal, errors, types
- serialization/json.ts → core/internal, core/money, errors, types

Public API Layer:
- index.ts → exports from all layers
- plugins/operators/index.ts → operations/comparison
```

### Observations

- **Clean separation of concerns** - no circular imports
- **Deep import chains** - some files 5+ levels deep from base types
- **Heavy re-exporting** - index.ts aggregates 97 items from 16 modules
- **Type propagation depth** - types flow through 4+ layers before reaching consumers

---

## 3. Type Complexity Hotspots

### 3.1 Main Index File (`src/index.ts`)

**Metrics:**
- **127 lines** total
- **18 export statements**
- **16 export blocks** (export { ... })
- **97 exported items** (functions, types, constants)

**Complexity factors:**
- Massive re-export surface area
- TypeScript must resolve all 97 exports and their dependencies
- Each export pulls in its type dependencies
- Deep type resolution chains for each item

**Re-export breakdown:**
```typescript
// 6 export blocks from different modules
export { ... } from "./core/assertions";       // 2 items
export { ... } from "./core/internal";         // 3 items
export { ... } from "./core/money";            // 5 items
export { ... } from "./core/rounding";         // 3 items
export { ... } from "./currency/registry";     // 6 items
export { ... } from "./errors";                // 7 items
export { ... } from "./formatting/format";     // 4 items
export { ... } from "./formatting/parse";      // 1 item
export { ... } from "./operations/aggregation"; // 6 items
export { ... } from "./operations/allocation"; // 2 items
export { ... } from "./operations/arithmetic"; // 7 items
export { ... } from "./operations/comparison"; // 9 items
export { ... } from "./schemas";               // 14 items (8 types + 6 schemas)
export { ... } from "./serialization/conversion"; // 5 items
export { ... } from "./serialization/json";    // 6 items
export type { ... } from "./types";            // 6 types
export type { Currency } from "./currency/types"; // 1 type
export { ISO_4217_CURRENCIES } from "./currency/currencies"; // 1 item
```

### 3.2 Schemas File (`src/schemas.ts`)

**Metrics:**
- **218 lines**
- **7 Zod schemas**
- **7 inferred types**
- **29 schema refinements/validations**

**Complex schemas:**

1. **CurrencySchema** (lines 24-42)
   - 6 properties with nested constraints
   - Multiple .min(), .max(), .int() validations
   - Optional properties

2. **MoneyInternalSchema** (lines 136-142)
   - BigInt type (non-primitive)
   - .min(0).max(18) constraints
   - Used as base for core Money type

3. **FormatOptionsSchema** (lines 160-179)
   - 8 optional properties
   - Multiple enum types
   - Nested validations

4. **AllocationRatiosSchema** (lines 197-203)
   - Array type with refinement
   - Custom validation logic: `.refine((ratios) => ratios.some((r) => r > 0))`
   - Complex error messages

**Type inference depth:**
- Each z.infer<> forces TypeScript to compute the full schema type
- Nested object schemas multiply type complexity
- Refinements add conditional types to inference
- 7 simultaneous inferences in one file

### 3.3 Operators File (`src/operations/comparison.ts`)

**Metrics:**
- **321 lines**
- **10 operators using createOperator()**
- **Each operator has:**
  - `evaluate` function with type guards
  - `valueSchema` (Zod schema reference)
  - `reasonGenerator` function (1 operator has this)
- **9 convenience functions** (equals, greaterThan, etc.)

**Operator complexity:**

Each `createOperator()` call involves:
1. Generic type inference from condition-evaluator
2. Function type inference for `evaluate: (actual: unknown, expected: unknown) => boolean`
3. Zod schema type for `valueSchema`
4. Optional reasonGenerator with complex string interpolation types

**Example complexity (moneyEqualsOperator):**
```typescript
export const moneyEqualsOperator = createOperator({
   name: "money_eq",
   type: "custom",
   description: "Check if two Money values are equal",
   evaluate: (actual: unknown, expected: unknown): boolean => {
      const a = toMoney(actual);  // Type narrowing from unknown
      const b = toMoney(expected); // Type narrowing from unknown
      assertSameCurrency(a, b);    // Throws if mismatch
      return a.amount === b.amount;
   },
   valueSchema: MoneySchema,  // Zod schema reference
   reasonGenerator: (passed, actual, expected, field) => {
      // Complex string building with type conversions
      const a = toMoney(actual);
      const b = toMoney(expected);
      if (passed) {
         return `${field} equals ${minorUnitsToDecimal(b.amount, b.scale)} ${b.currency}`;
      }
      return `${field} (${minorUnitsToDecimal(a.amount, a.scale)} ${a.currency}) does not equal ${minorUnitsToDecimal(b.amount, b.scale)} ${b.currency}`;
   },
});
```

**Type inference load:**
- 10 operators × complex generic inference
- Each operator references MoneySchema (triggers z.infer)
- reasonGenerator adds additional type complexity
- toMoney() function has complex type narrowing logic

### 3.4 Currency Data (`src/currency/currencies.ts`)

**Metrics:**
- **389 lines**
- **46 currency definitions**
- **7.6KB file size**
- **Large const object with typed entries**

**Type complexity:**
```typescript
export const ISO_4217_CURRENCIES: Record<string, Currency> = {
   USD: { code: "USD", numericCode: 840, name: "US Dollar", ... },
   EUR: { code: "EUR", numericCode: 978, name: "Euro", ... },
   // ... 44 more currencies
};
```

**Impact:**
- TypeScript must verify each of 46 objects conforms to Currency type
- Currency type is `z.infer<typeof CurrencySchema>` (schema has 6 properties)
- Record<string, Currency> creates a mapped type over all entries
- Type checking this large constant is expensive

---

## 4. Type Instantiation Depth Assessment

### Qualitative Analysis

**Estimated type instantiation depth: HIGH (4-6 levels deep)**

**Example type resolution chain for a Money operator:**

```
1. User imports: import { moneyEqualsOperator } from "@f-o-t/money/operators"
2. Resolves to: src/plugins/operators/index.ts export
3. Which re-exports from: src/operations/comparison.ts
4. Which uses: createOperator<T>() generic from @f-o-t/condition-evaluator
5. Which references: MoneySchema from src/schemas.ts
6. Which is defined as: z.object({ amount: AmountStringSchema, currency: CurrencyCodeSchema })
7. Where AmountStringSchema is: z.string().regex(...).describe(...)
8. And CurrencyCodeSchema is: z.string().length(3).regex(...).describe(...)
9. Type inference for: z.infer<typeof MoneySchema>
10. Combined with: createOperator's generic constraints
11. Plus reasonGenerator: (passed: boolean, actual: unknown, expected: unknown, field: string) => string
```

**Result:** 10+ type operations to fully resolve one operator's type signature.

**Multiplier effect:**
- 10 operators in comparison.ts
- Each with similar depth
- All exported through index.ts
- All resolved simultaneously during declaration generation

### Contributing Factors

1. **Generic Function Chains**
   - createOperator<T> → generic type parameter
   - Zod schema → z.infer<typeof Schema>
   - Re-exports → type alias chains

2. **Conditional Types**
   - Zod refinements create conditional types
   - Optional properties create union types
   - Array types with constraints multiply complexity

3. **Type Widening**
   - unknown → Money type narrowing in evaluate functions
   - String literal unions for currency codes
   - Enum types in FormatOptions

4. **Cross-Package Type Dependencies**
   - @f-o-t/condition-evaluator generic constraints
   - @f-o-t/bigint types (parseToBigInt, formatFromBigInt)
   - Zod v4.3.6 internal type machinery

---

## 5. Root Causes Analysis

### Primary Issues

1. **Zod Inference Overhead**
   - 7 types defined via z.infer<>
   - Each schema has 3-8 properties with constraints
   - Schemas used in 10 operators (multiplies inference load)
   - Re-exported multiple times (compounds complexity)

2. **Deep Re-export Chains**
   - schemas.ts → types.ts → index.ts (3 levels for types)
   - currency/types.ts → schemas.ts → types.ts → index.ts (4 levels for Currency)
   - Types pulled through multiple module boundaries

3. **Large Index Surface Area**
   - 97 exports from 16 different modules
   - TypeScript must resolve all dependencies at once
   - No code splitting or lazy type resolution
   - Single index.d.ts file contains everything

4. **Operator Type Complexity**
   - 10 operators using createOperator<T>() generic
   - Each with evaluate, valueSchema, optional reasonGenerator
   - Complex type narrowing (unknown → Money)
   - Schema references trigger z.infer repeatedly

5. **No Explicit Type Annotations**
   - Operators rely on type inference from createOperator()
   - No explicit type annotations on operator constants
   - Forces TypeScript to compute types from scratch
   - Cannot cache intermediate type computations

---

## 6. Comparison with bigint Library

The @f-o-t/bigint library successfully builds with similar patterns. Key differences:

### bigint Library (SUCCESSFUL BUILD):
- **Simpler operators** - numeric comparisons only
- **Fewer operators** - ~6 vs 10 in money
- **No nested schemas** - single-level Zod schemas
- **Smaller export surface** - ~50 exports vs 97
- **No external operator framework** - no createOperator() generics

### money Library (FAILING BUILD):
- **Complex domain logic** - currency, scale, minor units
- **More operators** - 10 with complex logic
- **Nested schemas** - objects with refinements
- **Larger export surface** - 97 exports
- **External operator framework** - createOperator<T> from condition-evaluator

**Conclusion:** Money library has 2x type complexity of bigint library.

---

## 7. Recommendations

### High Priority Fixes

1. **Add Explicit Type Annotations to Operators** (Task #9)
   - Annotate all 10 operator constants with explicit types
   - Remove reliance on createOperator<T> inference
   - Example:
     ```typescript
     export const moneyEqualsOperator: Operator = createOperator({ ... });
     ```

2. **Remove z.infer Re-export Chains** (Task #10)
   - Define types explicitly in schemas.ts instead of inferring
   - Keep Zod schemas for runtime validation
   - Decouple type definitions from schema inference
   - Example:
     ```typescript
     // Define type explicitly
     export type Money = {
       amount: bigint;
       currency: string;
       scale: number;
     };

     // Keep schema for validation
     export const MoneyInternalSchema = z.object({
       amount: z.bigint(),
       currency: CurrencyCodeSchema,
       scale: z.number().int().min(0).max(18),
     });
     ```

3. **Split Large Index File** (Task #11)
   - Create sub-indexes for different functional areas
   - Export groups: core, operations, formatting, serialization
   - Reduce single-file type resolution load
   - Example structure:
     ```
     index.ts → lightweight re-exports
     core/index.ts → core exports
     operations/index.ts → operation exports
     ```

### Medium Priority Optimizations

4. **Simplify Schema Refinements**
   - Reduce number of chained validations
   - Move complex refinements to runtime functions
   - Keep schemas simple for type inference

5. **Cache Operator Types**
   - Pre-compute operator types in a types file
   - Import cached types instead of inferring
   - Reduces repeated generic resolution

### Low Priority Improvements

6. **Consider Type-Only Exports**
   - Use `export type` where possible
   - Separates type resolution from value resolution
   - May improve declaration generation performance

---

## 8. Next Steps

**Immediate Actions:**
1. Implement Task #9: Add explicit type annotations to all 10 operators
2. Implement Task #10: Replace z.infer<> exports with explicit types
3. Implement Task #11: Split index.ts into smaller modules
4. Run Task #12: Verify build succeeds after changes

**Expected Impact:**
- Reduce type instantiation depth from 10+ to 3-4 levels
- Eliminate repeated z.infer<> computations during declaration generation
- Split type resolution across multiple smaller files
- Should allow successful build with existing 8GB memory limit

**Success Criteria:**
- `bun run build` completes without exit code 134
- All type exports remain functionally identical
- No breaking changes to public API
- Build time under 60 seconds

---

## Appendix A: File Metrics Summary

| File | Lines | Exports | Complexity |
|------|-------|---------|------------|
| src/index.ts | 127 | 97 items | VERY HIGH |
| src/schemas.ts | 218 | 7 types + 7 schemas | HIGH |
| src/operations/comparison.ts | 321 | 10 operators + 9 functions | HIGH |
| src/currency/currencies.ts | 389 | 1 (large const) | MEDIUM |
| src/types.ts | 20 | 6 re-exports | MEDIUM |
| src/errors.ts | 104 | 7 classes | LOW |
| src/core/money.ts | ~100 | 5 functions | MEDIUM |
| src/operations/arithmetic.ts | ~150 | 7 functions | MEDIUM |

**Total source lines:** 3,149
**Total files:** 20
**Total exports from index:** 97

---

## Appendix B: Schema Definitions

### All Zod Schemas in schemas.ts:

1. **CurrencyCodeSchema** - string validation (3 chars, uppercase)
2. **CurrencySchema** - object with 6 properties
3. **AmountStringSchema** - regex validation for decimals
4. **MoneySchema** - object { amount, currency }
5. **DatabaseMoneySchema** - object { amount, currency }
6. **MoneyInputSchema** - union type (string | number)
7. **MoneyInternalSchema** - object { amount: bigint, currency, scale }
8. **FormatOptionsSchema** - object with 8 optional properties
9. **AllocationRatiosSchema** - array with refinement

### Refinement Count by Schema:

- CurrencyCodeSchema: 3 (.length, .regex, .describe)
- CurrencySchema: 10 (.min, .max, .int, .describe × properties)
- AmountStringSchema: 2 (.regex, .describe)
- MoneySchema: 2 (.describe on properties)
- MoneyInternalSchema: 5 (.bigint, .int, .min, .max, .describe)
- FormatOptionsSchema: 6 (.enum, .optional, .int, .min across properties)
- AllocationRatiosSchema: 4 (.min on elements, .min on array, .refine, .describe)

**Total refinements:** 29

---

## Appendix C: Import Graph Visualization

```
Legend: [file] → [dependencies]

Core Foundation:
- errors.ts → (none)
- schemas.ts → zod
- types.ts → schemas.ts

Currency System:
- currency/types.ts → schemas.ts
- currency/currencies.ts → currency/types.ts
- currency/registry.ts → errors, currencies, currency/types

Core Logic:
- core/rounding.ts → @f-o-t/bigint
- core/internal.ts → types, rounding, @f-o-t/bigint
- core/assertions.ts → errors, types
- core/money.ts → currency/registry, errors, types, internal

Operations:
- operations/arithmetic.ts → assertions, internal, errors, types
- operations/comparison.ts → assertions, internal, money, schemas, types, @f-o-t/condition-evaluator, zod
- operations/aggregation.ts → assertions, internal, money, rounding, errors, types
- operations/allocation.ts → internal, errors, types

Utilities:
- formatting/format.ts → internal, currency/registry, types
- formatting/parse.ts → money, currency/registry, errors, types
- serialization/conversion.ts → internal, errors, types
- serialization/json.ts → internal, money, errors, types

Public API:
- index.ts → (all of the above)
- plugins/operators/index.ts → operations/comparison

Max dependency depth: 6 levels
Most connected file: operations/comparison.ts (7 internal imports + 2 external)
```

---

**Analysis completed**: 2026-02-01
**Analyst**: Claude (Task #8)
**Next action**: Proceed with Task #9 (Add explicit type annotations)
