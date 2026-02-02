# @f-o-t/bigint

Low-level bigint primitives for precise decimal arithmetic. Provides standardized bigint operations across all FOT libraries.

## Installation

```bash
bun add @f-o-t/bigint
```

## Features

- ✅ Parse decimal strings/numbers to bigint with configurable scale
- ✅ Format bigint to decimal strings with trailing zero control
- ✅ Arithmetic operations (add, subtract, multiply, divide)
- ✅ Comparison operations (equals, greater than, less than, etc.)
- ✅ Multiple rounding modes (truncate, banker's rounding, ceil, floor)
- ✅ Scale conversion utilities
- ✅ Zod-based validation throughout
- ✅ Optional condition-evaluator integration

## Core Usage

### Parsing

```typescript
import { parseToBigInt } from "@f-o-t/bigint";

// Parse decimal string to bigint
const value1 = parseToBigInt({ value: "10.50", scale: 2 });  // 1050n (scale 2)
const value2 = parseToBigInt({ value: "123.456", scale: 3 }); // 123456n (scale 3)

// Different rounding modes
parseToBigInt({ value: "10.999", scale: 2, roundingMode: "truncate" });  // 1099n (default)
parseToBigInt({ value: "10.999", scale: 2, roundingMode: "round" });     // 1100n (banker's rounding)
parseToBigInt({ value: "10.999", scale: 2, roundingMode: "ceil" });      // 1100n (round up)
parseToBigInt({ value: "10.999", scale: 2, roundingMode: "floor" });     // 1099n (round down)
```

### Formatting

```typescript
import { formatFromBigInt } from "@f-o-t/bigint";

// Format bigint to decimal string
formatFromBigInt({ value: 1050n, scale: 2 });        // "10.5" (trims trailing zeros)
formatFromBigInt({ value: 1050n, scale: 2, trimTrailingZeros: false }); // "10.50" (keeps trailing zeros)
formatFromBigInt({ value: 100n, scale: 0 });         // "100" (no decimals)
```

### Arithmetic

All arithmetic operations require the same scale for both operands.

```typescript
import { add, subtract, multiply, divide } from "@f-o-t/bigint";

// Addition and subtraction
add({ a: 1050n, b: 525n, scale: 2 });       // 1575n (10.50 + 5.25 = 15.75)
subtract({ a: 1050n, b: 525n, scale: 2 });  // 525n (10.50 - 5.25 = 5.25)

// Multiplication (result maintains scale)
multiply({ a: 1000n, b: 500n, scale: 2 });  // 5000n (10.00 * 5.00 = 50.00)

// Division with rounding
divide({ a: 10000n, b: 300n, scale: 2 });            // 3333n (truncate, default)
divide({ a: 10000n, b: 300n, scale: 2, roundingMode: "round" });   // 3333n (banker's rounding)
divide({ a: 10000n, b: 300n, scale: 2, roundingMode: "ceil" });    // 3334n
```

### Comparison

```typescript
import { compare, equals, greaterThan, lessThan } from "@f-o-t/bigint";

compare({ a: 100n, b: 50n, scale: 2 });     // 1 (greater)
compare({ a: 50n, b: 100n, scale: 2 });     // -1 (less)
compare({ a: 100n, b: 100n, scale: 2 });    // 0 (equal)

equals({ a: 100n, b: 100n, scale: 2 });     // true
greaterThan({ a: 100n, b: 50n, scale: 2 }); // true
lessThan({ a: 50n, b: 100n, scale: 2 });    // true
```

### Rounding & Scale Conversion

```typescript
import { bankersRound, convertScale } from "@f-o-t/bigint";

// Banker's rounding (round half to even)
bankersRound(25n, 10n);  // 2n (2.5 → 2, even)
bankersRound(35n, 10n);  // 4n (3.5 → 4, even)

// Convert between scales
convertScale({ value: 100n, fromScale: 2, toScale: 4 });              // 10000n (1.00 @ 2 → 1.0000 @ 4)
convertScale({ value: 10050n, fromScale: 4, toScale: 2, roundingMode: "round" });   // 100n (1.0050 @ 4 → 1.00 @ 2, banker's rounding to even)
convertScale({ value: 10050n, fromScale: 4, toScale: 2, roundingMode: "truncate" }); // 100n (1.0050 @ 4 → 1.00 @ 2)
```

## Condition-Evaluator Integration

Optional integration with `@f-o-t/condition-evaluator` for rule-based evaluations.

```typescript
import { createEvaluator } from "@f-o-t/condition-evaluator";
import {
  bigintEqualsOperator,
  bigintGreaterThanOperator,
  bigintBetweenOperator
} from "@f-o-t/bigint/operators";

const evaluator = createEvaluator({
  operators: {
    bigint_eq: bigintEqualsOperator,
    bigint_gt: bigintGreaterThanOperator,
    bigint_between: bigintBetweenOperator,
  }
});

// Evaluate conditions
evaluator.evaluate({
  type: "custom",
  field: "measurement",
  operator: "bigint_gt",
  value: { value: 10000n, scale: 2 }  // 100.00
}, {
  data: {
    measurement: { value: 15000n, scale: 2 }  // 150.00
  }
}); // true

// Range checks
evaluator.evaluate({
  type: "custom",
  field: "amount",
  operator: "bigint_between",
  value: {
    min: { value: 0n, scale: 2 },
    max: { value: 10000n, scale: 2 }
  }
}, {
  data: {
    amount: { value: 5000n, scale: 2 }  // 50.00
  }
}); // true
```

### Available Operators

**Comparison:**
- `bigint_eq` - Equals
- `bigint_neq` - Not equals
- `bigint_gt` - Greater than
- `bigint_gte` - Greater than or equal
- `bigint_lt` - Less than
- `bigint_lte` - Less than or equal

**Range/State:**
- `bigint_between` - Value within range (inclusive)
- `bigint_zero` - Value is zero
- `bigint_positive` - Value is positive
- `bigint_negative` - Value is negative

## Validation

All functions use Zod schemas for input validation:

```typescript
import { ParseInputSchema, ScaledBigIntSchema } from "@f-o-t/bigint";

// Validate parse inputs
ParseInputSchema.parse({ value: "10.5", scale: 2 });  // ✓
ParseInputSchema.parse({ value: "abc", scale: 2 });   // ✗ throws ZodError

// Validate scaled bigint
ScaledBigIntSchema.parse({ value: 100n, scale: 2 });  // ✓
ScaledBigIntSchema.parse({ value: "100", scale: 2 }); // ✗ throws ZodError
```

## Type Exports

```typescript
import type {
  RoundingMode,
  ScaledBigInt,
  ParseInput,
  ArithmeticInput
} from "@f-o-t/bigint";

const mode: RoundingMode = "round";
const value: ScaledBigInt = { value: 100n, scale: 2 };
```

## Design Philosophy

This library provides **low-level primitives only**:
- No domain-specific concepts (use `@f-o-t/money` or `@f-o-t/uom` for that)
- All operations require explicit scale parameters
- Arithmetic operations enforce same-scale requirement
- Zod handles all validation (no custom error classes)

## License

MIT
