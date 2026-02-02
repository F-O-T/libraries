# BigInt Library Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `@f-o-t/bigint` library providing low-level bigint primitives for precise decimal arithmetic, standardizing bigint operations across all FOT libraries.

**Architecture:** Pure utility functions for parsing, formatting, arithmetic, comparison, and rounding operations on bigint values with configurable decimal scale. Zod-based validation throughout. Optional condition-evaluator integration via operators plugin.

**Tech Stack:** TypeScript, Bun, Zod 4.3.6, @f-o-t/cli, @f-o-t/config, @f-o-t/condition-evaluator (peer)

---

## Task 1: Project Scaffolding

**Files:**
- Create: `libraries/bigint/package.json`
- Create: `libraries/bigint/fot.config.ts`
- Create: `libraries/bigint/README.md`
- Create: `libraries/bigint/src/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "@f-o-t/bigint",
  "version": "0.1.0",
  "description": "Low-level bigint primitives for precise decimal arithmetic",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./operators": "./dist/plugins/operators/index.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "fot build",
    "test": "fot test",
    "lint": "fot lint",
    "format": "fot format",
    "check": "fot check"
  },
  "keywords": [
    "bigint",
    "decimal",
    "arithmetic",
    "precision",
    "money",
    "measurement"
  ],
  "dependencies": {
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@f-o-t/cli": "^0.1.0",
    "@f-o-t/config": "^0.1.0",
    "@f-o-t/condition-evaluator": "^0.1.0",
    "@types/bun": "latest"
  },
  "peerDependencies": {
    "@f-o-t/condition-evaluator": "^0.1.0"
  },
  "peerDependenciesMeta": {
    "@f-o-t/condition-evaluator": {
      "optional": true
    }
  }
}
```

**Step 2: Create fot.config.ts**

```typescript
import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
  external: ['zod'],
  plugins: ['operators'],
});
```

**Step 3: Create README.md**

```markdown
# @f-o-t/bigint

Low-level bigint primitives for precise decimal arithmetic.

## Installation

```bash
bun add @f-o-t/bigint
```

## Features

- Parse decimal strings/numbers to bigint with configurable scale
- Format bigint to decimal strings
- Arithmetic operations (add, subtract, multiply, divide)
- Comparison operations
- Multiple rounding modes (truncate, banker's rounding, ceil, floor)
- Scale conversion utilities
- Zod-based validation
- Optional condition-evaluator integration

## Usage

```typescript
import { parseToBigInt, add, formatFromBigInt } from "@f-o-t/bigint";

// Parse decimal to bigint with scale 2
const a = parseToBigInt("10.50", 2); // 1050n

// Add two values (same scale required)
const result = add(a, parseToBigInt("5.25", 2), 2); // 1575n

// Format back to decimal
formatFromBigInt(result, 2); // "15.75"
```

## License

MIT
```

**Step 4: Create empty index.ts**

```typescript
// Exports will be added as modules are implemented
```

**Step 5: Install dependencies**

Run: `cd libraries/bigint && bun install`
Expected: Dependencies installed successfully

**Step 6: Commit**

```bash
git add libraries/bigint/
git commit -m "feat(bigint): initialize library structure

- Add package.json with dependencies
- Add fot.config.ts for build
- Add README.md with basic usage"
```

---

## Task 2: Schemas Module

**Files:**
- Create: `libraries/bigint/src/schemas.ts`
- Create: `libraries/bigint/__tests__/schemas.test.ts`

**Step 1: Write failing schema tests**

Create `libraries/bigint/__tests__/schemas.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import {
  RoundingModeSchema,
  ScaleSchema,
  DecimalStringSchema,
  ParseInputSchema,
  ArithmeticInputSchema,
  DivideInputSchema,
  ConvertScaleInputSchema,
  FormatInputSchema,
  ScaledBigIntSchema,
} from "../src/schemas";

describe("RoundingModeSchema", () => {
  test("accepts valid rounding modes", () => {
    expect(RoundingModeSchema.parse("truncate")).toBe("truncate");
    expect(RoundingModeSchema.parse("round")).toBe("round");
    expect(RoundingModeSchema.parse("ceil")).toBe("ceil");
    expect(RoundingModeSchema.parse("floor")).toBe("floor");
  });

  test("rejects invalid rounding modes", () => {
    expect(() => RoundingModeSchema.parse("invalid")).toThrow();
  });
});

describe("ScaleSchema", () => {
  test("accepts non-negative integers", () => {
    expect(ScaleSchema.parse(0)).toBe(0);
    expect(ScaleSchema.parse(2)).toBe(2);
    expect(ScaleSchema.parse(12)).toBe(12);
  });

  test("rejects negative numbers", () => {
    expect(() => ScaleSchema.parse(-1)).toThrow();
  });

  test("rejects decimals", () => {
    expect(() => ScaleSchema.parse(1.5)).toThrow();
  });
});

describe("DecimalStringSchema", () => {
  test("accepts valid decimal strings", () => {
    expect(DecimalStringSchema.parse("123.45")).toBe("123.45");
    expect(DecimalStringSchema.parse("0.1")).toBe("0.1");
    expect(DecimalStringSchema.parse("-50.5")).toBe("-50.5");
    expect(DecimalStringSchema.parse("100")).toBe("100");
  });

  test("rejects invalid formats", () => {
    expect(() => DecimalStringSchema.parse("abc")).toThrow();
    expect(() => DecimalStringSchema.parse("12.34.56")).toThrow();
    expect(() => DecimalStringSchema.parse("")).toThrow();
  });
});

describe("ParseInputSchema", () => {
  test("accepts valid parse input", () => {
    const result = ParseInputSchema.parse({
      value: "10.5",
      scale: 2,
      roundingMode: "truncate",
    });
    expect(result.value).toBe("10.5");
    expect(result.scale).toBe(2);
    expect(result.roundingMode).toBe("truncate");
  });

  test("accepts number values", () => {
    const result = ParseInputSchema.parse({ value: 10.5, scale: 2 });
    expect(result.value).toBe(10.5);
  });

  test("rejects invalid input", () => {
    expect(() =>
      ParseInputSchema.parse({ value: "abc", scale: 2 })
    ).toThrow();
  });
});

describe("ArithmeticInputSchema", () => {
  test("accepts valid arithmetic input", () => {
    const result = ArithmeticInputSchema.parse({
      a: 100n,
      b: 50n,
      scale: 2,
    });
    expect(result.a).toBe(100n);
    expect(result.b).toBe(50n);
    expect(result.scale).toBe(2);
  });

  test("rejects negative scale", () => {
    expect(() =>
      ArithmeticInputSchema.parse({ a: 100n, b: 50n, scale: -1 })
    ).toThrow();
  });
});

describe("DivideInputSchema", () => {
  test("accepts valid division input", () => {
    const result = DivideInputSchema.parse({
      a: 100n,
      b: 3n,
      scale: 2,
      roundingMode: "round",
    });
    expect(result.a).toBe(100n);
    expect(result.b).toBe(3n);
  });

  test("rejects division by zero", () => {
    expect(() =>
      DivideInputSchema.parse({ a: 100n, b: 0n, scale: 2 })
    ).toThrow();
  });
});

describe("ConvertScaleInputSchema", () => {
  test("accepts valid scale conversion input", () => {
    const result = ConvertScaleInputSchema.parse({
      value: 100n,
      fromScale: 2,
      toScale: 4,
      roundingMode: "round",
    });
    expect(result.value).toBe(100n);
    expect(result.fromScale).toBe(2);
    expect(result.toScale).toBe(4);
  });
});

describe("FormatInputSchema", () => {
  test("accepts valid format input", () => {
    const result = FormatInputSchema.parse({
      value: 100n,
      scale: 2,
      trimTrailingZeros: true,
    });
    expect(result.trimTrailingZeros).toBe(true);
  });

  test("defaults trimTrailingZeros to true", () => {
    const result = FormatInputSchema.parse({ value: 100n, scale: 2 });
    expect(result.trimTrailingZeros).toBe(true);
  });
});

describe("ScaledBigIntSchema", () => {
  test("accepts valid scaled bigint", () => {
    const result = ScaledBigIntSchema.parse({ value: 100n, scale: 2 });
    expect(result.value).toBe(100n);
    expect(result.scale).toBe(2);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd libraries/bigint && bun test`
Expected: FAIL - schemas module not found

**Step 3: Implement schemas**

Create `libraries/bigint/src/schemas.ts`:

```typescript
import { z } from "zod";

/**
 * Rounding mode for handling excess decimal places
 */
export const RoundingModeSchema = z.enum(["truncate", "round", "ceil", "floor"]);

/**
 * Scale (decimal places) - must be non-negative integer
 */
export const ScaleSchema = z.number().int().nonnegative();

/**
 * Decimal string format validation
 */
export const DecimalStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, "Invalid number format");

/**
 * BigInt value schema
 */
export const BigIntValueSchema = z.bigint();

/**
 * Parse function input schema
 */
export const ParseInputSchema = z.object({
  value: z.union([z.number().finite(), DecimalStringSchema]),
  scale: ScaleSchema,
  roundingMode: RoundingModeSchema.optional(),
});

/**
 * Arithmetic operation input schema
 */
export const ArithmeticInputSchema = z
  .object({
    a: z.bigint(),
    b: z.bigint(),
    scale: ScaleSchema,
  })
  .refine((data) => data.scale >= 0, "Scale must be non-negative");

/**
 * Division input schema with zero-check
 */
export const DivideInputSchema = ArithmeticInputSchema.extend({
  roundingMode: RoundingModeSchema.optional(),
}).refine((data) => data.b !== 0n, "Division by zero is not allowed");

/**
 * Scale conversion input schema
 */
export const ConvertScaleInputSchema = z.object({
  value: z.bigint(),
  fromScale: ScaleSchema,
  toScale: ScaleSchema,
  roundingMode: RoundingModeSchema.optional(),
});

/**
 * Format function input schema
 */
export const FormatInputSchema = z.object({
  value: z.bigint(),
  scale: ScaleSchema,
  trimTrailingZeros: z.boolean().default(true),
});

/**
 * Scaled bigint value (for condition-evaluator integration)
 */
export const ScaledBigIntSchema = z.object({
  value: z.bigint(),
  scale: ScaleSchema,
});

// Type exports
export type RoundingMode = z.infer<typeof RoundingModeSchema>;
export type ParseInput = z.infer<typeof ParseInputSchema>;
export type ArithmeticInput = z.infer<typeof ArithmeticInputSchema>;
export type DivideInput = z.infer<typeof DivideInputSchema>;
export type ConvertScaleInput = z.infer<typeof ConvertScaleInputSchema>;
export type FormatInput = z.infer<typeof FormatInputSchema>;
export type ScaledBigInt = z.infer<typeof ScaledBigIntSchema>;
```

**Step 4: Run tests to verify they pass**

Run: `cd libraries/bigint && bun test`
Expected: All schema tests PASS

**Step 5: Commit**

```bash
git add libraries/bigint/src/schemas.ts libraries/bigint/__tests__/schemas.test.ts
git commit -m "feat(bigint): add Zod schemas for validation

- Add RoundingModeSchema with truncate/round/ceil/floor
- Add ScaleSchema for non-negative integers
- Add DecimalStringSchema with regex validation
- Add input schemas for all operations
- Add comprehensive schema tests"
```

---

## Task 3: Parse Module

**Files:**
- Create: `libraries/bigint/src/parse.ts`
- Create: `libraries/bigint/__tests__/parse.test.ts`

**Step 1: Write failing parse tests**

Create `libraries/bigint/__tests__/parse.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { parseToBigInt } from "../src/parse";

describe("parseToBigInt", () => {
  describe("basic parsing", () => {
    test("parses positive decimal string", () => {
      expect(parseToBigInt("10.5", 12)).toBe(10500000000000n);
    });

    test("parses negative decimal string", () => {
      expect(parseToBigInt("-10.5", 12)).toBe(-10500000000000n);
    });

    test("parses integer string", () => {
      expect(parseToBigInt("100", 2)).toBe(10000n);
    });

    test("parses zero", () => {
      expect(parseToBigInt("0", 2)).toBe(0n);
      expect(parseToBigInt("0.0", 2)).toBe(0n);
      expect(parseToBigInt("-0", 2)).toBe(0n);
    });

    test("parses number values", () => {
      expect(parseToBigInt(10.5, 2)).toBe(1050n);
      expect(parseToBigInt(123.45, 2)).toBe(12345n);
    });
  });

  describe("scale handling", () => {
    test("pads with zeros when decimals < scale", () => {
      expect(parseToBigInt("10.5", 4)).toBe(105000n);
      expect(parseToBigInt("10", 2)).toBe(1000n);
    });

    test("handles scale of 0", () => {
      expect(parseToBigInt("100", 0)).toBe(100n);
      expect(parseToBigInt("100.99", 0, "truncate")).toBe(100n);
    });

    test("handles large scale", () => {
      expect(parseToBigInt("1.5", 18)).toBe(1500000000000000000n);
    });
  });

  describe("rounding modes", () => {
    test("truncates by default", () => {
      expect(parseToBigInt("10.999", 2)).toBe(1099n);
      expect(parseToBigInt("10.991", 2)).toBe(1099n);
    });

    test("truncates explicitly", () => {
      expect(parseToBigInt("10.999", 2, "truncate")).toBe(1099n);
    });

    test("rounds using banker's rounding", () => {
      expect(parseToBigInt("10.995", 2, "round")).toBe(1100n); // round up to even
      expect(parseToBigInt("10.985", 2, "round")).toBe(1098n); // round down to even
      expect(parseToBigInt("10.996", 2, "round")).toBe(1100n); // normal round up
      expect(parseToBigInt("10.994", 2, "round")).toBe(1099n); // normal round down
    });

    test("rounds up with ceil", () => {
      expect(parseToBigInt("10.991", 2, "ceil")).toBe(1100n);
      expect(parseToBigInt("10.001", 2, "ceil")).toBe(1001n);
    });

    test("rounds down with floor", () => {
      expect(parseToBigInt("10.999", 2, "floor")).toBe(1099n);
      expect(parseToBigInt("10.001", 2, "floor")).toBe(1000n);
    });
  });

  describe("edge cases", () => {
    test("handles very large numbers", () => {
      const large = "999999999999999.99";
      expect(parseToBigInt(large, 2)).toBe(99999999999999999n);
    });

    test("handles very small decimals", () => {
      expect(parseToBigInt("0.000001", 6)).toBe(1n);
    });
  });

  describe("validation errors", () => {
    test("throws on invalid format", () => {
      expect(() => parseToBigInt("abc", 2)).toThrow();
      expect(() => parseToBigInt("12.34.56", 2)).toThrow();
      expect(() => parseToBigInt("", 2)).toThrow();
    });

    test("throws on negative scale", () => {
      expect(() => parseToBigInt("10", -1)).toThrow();
    });

    test("throws on non-finite numbers", () => {
      expect(() => parseToBigInt(Infinity, 2)).toThrow();
      expect(() => parseToBigInt(NaN, 2)).toThrow();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd libraries/bigint && bun test parse`
Expected: FAIL - parse module not found

**Step 3: Implement parse module**

Create `libraries/bigint/src/parse.ts`:

```typescript
import type { RoundingMode } from "./schemas";
import { ParseInputSchema } from "./schemas";
import { bankersRound, roundUp, roundDown } from "./round";

/**
 * Parse a decimal number (string or number) to BigInt with specified scale
 *
 * @param value - The numeric value as string or number
 * @param scale - The number of decimal places to preserve
 * @param roundingMode - How to handle excess decimal places (default: "truncate")
 * @returns BigInt representation with the specified precision
 *
 * @example
 * ```typescript
 * parseToBigInt("10.5", 12)           // 10500000000000n
 * parseToBigInt(25.75, 2)             // 2575n
 * parseToBigInt("10.999", 2, "round") // 1100n (banker's rounding)
 * parseToBigInt("10.999", 2, "ceil")  // 1100n (round up)
 * ```
 */
export function parseToBigInt(
  value: number | string,
  scale: number,
  roundingMode: RoundingMode = "truncate",
): bigint {
  // Validate inputs with Zod
  const validated = ParseInputSchema.parse({ value, scale, roundingMode });

  // Convert to string for parsing
  const valueStr = String(validated.value);

  // Normalize the string
  const normalized = valueStr.trim();

  // Check for negative
  const isNegative = normalized.startsWith("-");
  const absStr = isNegative ? normalized.slice(1) : normalized;

  // Split by decimal point
  const parts = absStr.split(".");
  const intPart = parts[0] || "0";
  const decPart = parts[1] || "";

  // Pad or truncate/round decimal part to match scale
  let amount: bigint;

  if (decPart.length <= scale) {
    // Pad with zeros
    const adjustedDecPart = decPart.padEnd(scale, "0");
    const combined = intPart + adjustedDecPart;
    amount = BigInt(combined);
  } else {
    // Need to round/truncate
    const mode = validated.roundingMode ?? "truncate";

    if (mode === "truncate") {
      const adjustedDecPart = decPart.slice(0, scale);
      const combined = intPart + adjustedDecPart;
      amount = BigInt(combined);
    } else {
      // Parse with full precision, then round
      const fullAmount = BigInt(intPart + decPart);
      const extraDigits = decPart.length - scale;
      const divisor = 10n ** BigInt(extraDigits);

      if (mode === "round") {
        amount = bankersRound(fullAmount, divisor);
      } else if (mode === "ceil") {
        amount = roundUp(fullAmount, divisor);
      } else {
        // floor
        amount = roundDown(fullAmount, divisor);
      }
    }
  }

  return isNegative ? -amount : amount;
}
```

**Step 4: Note - tests will fail until round module exists**

The parse module depends on round module. We'll implement round module next, then verify parse tests pass.

**Step 5: Commit parse module**

```bash
git add libraries/bigint/src/parse.ts libraries/bigint/__tests__/parse.test.ts
git commit -m "feat(bigint): add parse module (pending round module)

- Add parseToBigInt function with scale support
- Support all rounding modes
- Add comprehensive parse tests
- Note: Tests will pass after round module is implemented"
```

---

## Task 4: Round Module

**Files:**
- Create: `libraries/bigint/src/round.ts`
- Create: `libraries/bigint/__tests__/round.test.ts`

**Step 1: Write failing round tests**

Create `libraries/bigint/__tests__/round.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { bankersRound, roundUp, roundDown, convertScale } from "../src/round";

describe("bankersRound", () => {
  test("rounds halfway cases to even", () => {
    expect(bankersRound(25n, 10n)).toBe(2n); // 2.5 → 2 (even)
    expect(bankersRound(35n, 10n)).toBe(4n); // 3.5 → 4 (even)
    expect(bankersRound(45n, 10n)).toBe(4n); // 4.5 → 4 (even)
    expect(bankersRound(55n, 10n)).toBe(6n); // 5.5 → 6 (even)
  });

  test("rounds non-halfway cases normally", () => {
    expect(bankersRound(24n, 10n)).toBe(2n); // 2.4 → 2
    expect(bankersRound(26n, 10n)).toBe(3n); // 2.6 → 3
    expect(bankersRound(34n, 10n)).toBe(3n); // 3.4 → 3
    expect(bankersRound(36n, 10n)).toBe(4n); // 3.6 → 4
  });

  test("handles negative values", () => {
    expect(bankersRound(-25n, 10n)).toBe(-2n); // -2.5 → -2 (even)
    expect(bankersRound(-35n, 10n)).toBe(-4n); // -3.5 → -4 (even)
    expect(bankersRound(-26n, 10n)).toBe(-3n); // -2.6 → -3
  });

  test("handles odd divisors", () => {
    expect(bankersRound(21n, 6n)).toBe(4n); // 3.5 → 4 (even)
    expect(bankersRound(15n, 7n)).toBe(2n); // 2.14... → 2
  });

  test("throws on division by zero", () => {
    expect(() => bankersRound(10n, 0n)).toThrow();
  });
});

describe("roundUp", () => {
  test("always rounds up", () => {
    expect(roundUp(25n, 10n)).toBe(3n);
    expect(roundUp(24n, 10n)).toBe(3n);
    expect(roundUp(21n, 10n)).toBe(3n);
  });

  test("handles exact divisions", () => {
    expect(roundUp(20n, 10n)).toBe(2n);
    expect(roundUp(30n, 10n)).toBe(3n);
  });

  test("handles negative values", () => {
    expect(roundUp(-25n, 10n)).toBe(-2n); // rounds towards positive infinity
    expect(roundUp(-21n, 10n)).toBe(-2n);
  });

  test("throws on division by zero", () => {
    expect(() => roundUp(10n, 0n)).toThrow();
  });
});

describe("roundDown", () => {
  test("always rounds down", () => {
    expect(roundDown(25n, 10n)).toBe(2n);
    expect(roundDown(29n, 10n)).toBe(2n);
    expect(roundDown(21n, 10n)).toBe(2n);
  });

  test("handles exact divisions", () => {
    expect(roundDown(20n, 10n)).toBe(2n);
    expect(roundDown(30n, 10n)).toBe(3n);
  });

  test("handles negative values", () => {
    expect(roundDown(-25n, 10n)).toBe(-3n); // rounds towards negative infinity
    expect(roundDown(-21n, 10n)).toBe(-3n);
  });

  test("throws on division by zero", () => {
    expect(() => roundDown(10n, 0n)).toThrow();
  });
});

describe("convertScale", () => {
  test("scales up without rounding", () => {
    expect(convertScale(100n, 2, 4)).toBe(10000n); // 1.00 @ 2 → 1.0000 @ 4
    expect(convertScale(50n, 0, 2)).toBe(5000n); // 50 @ 0 → 50.00 @ 2
  });

  test("scales down with truncation", () => {
    expect(convertScale(10050n, 4, 2, "truncate")).toBe(100n); // 1.0050 @ 4 → 1.00 @ 2
    expect(convertScale(999n, 3, 1, "truncate")).toBe(99n); // 0.999 @ 3 → 0.9 @ 1
  });

  test("scales down with rounding", () => {
    expect(convertScale(10050n, 4, 2, "round")).toBe(101n); // 1.0050 @ 4 → 1.01 @ 2
    expect(convertScale(10045n, 4, 2, "round")).toBe(100n); // 1.0045 @ 4 → 1.00 @ 2
  });

  test("scales down with ceil", () => {
    expect(convertScale(10001n, 4, 2, "ceil")).toBe(101n);
  });

  test("scales down with floor", () => {
    expect(convertScale(10099n, 4, 2, "floor")).toBe(100n);
  });

  test("handles same scale", () => {
    expect(convertScale(100n, 2, 2)).toBe(100n);
  });

  test("handles negative values", () => {
    expect(convertScale(-100n, 2, 4)).toBe(-10000n);
    expect(convertScale(-10050n, 4, 2, "round")).toBe(-101n);
  });

  test("validates input", () => {
    expect(() => convertScale(100n, -1, 2)).toThrow();
    expect(() => convertScale(100n, 2, -1)).toThrow();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd libraries/bigint && bun test round`
Expected: FAIL - round module not found

**Step 3: Implement round module**

Create `libraries/bigint/src/round.ts`:

```typescript
import type { RoundingMode } from "./schemas";
import { ConvertScaleInputSchema } from "./schemas";

/**
 * Banker's rounding (round half to even)
 *
 * When the value is exactly halfway between two values, rounds to the nearest even number.
 * This prevents systematic bias that would occur with traditional rounding.
 *
 * @param value - The value to round (numerator)
 * @param divisor - The divisor to round by
 * @returns Rounded quotient
 *
 * @example
 * ```typescript
 * bankersRound(25n, 10n)  // 2n (2.5 → 2, round to even)
 * bankersRound(35n, 10n)  // 4n (3.5 → 4, round to even)
 * bankersRound(26n, 10n)  // 3n (2.6 → 3, normal rounding)
 * ```
 */
export function bankersRound(value: bigint, divisor: bigint): bigint {
  if (divisor === 0n) {
    throw new Error("Division by zero");
  }

  // Handle negative values
  const isNegative = value < 0n !== divisor < 0n;
  const absValue = value < 0n ? -value : value;
  const absDivisor = divisor < 0n ? -divisor : divisor;

  const quotient = absValue / absDivisor;
  const remainder = absValue % absDivisor;

  let result: bigint;

  // Detect true halfway: remainder * 2 == divisor
  const isExactlyHalf = remainder * 2n === absDivisor;

  if (isExactlyHalf) {
    // Exactly halfway - round to even (banker's rounding)
    if (quotient % 2n === 0n) {
      result = quotient; // Quotient is even, round down
    } else {
      result = quotient + 1n; // Quotient is odd, round up to make it even
    }
  } else {
    // Not exactly halfway - use standard rounding
    const half = absDivisor / 2n;
    if (remainder <= half) {
      result = quotient;
    } else {
      result = quotient + 1n;
    }
  }

  return isNegative ? -result : result;
}

/**
 * Round up (ceiling)
 *
 * @param value - The value to round
 * @param divisor - The divisor
 * @returns Quotient rounded up
 */
export function roundUp(value: bigint, divisor: bigint): bigint {
  if (divisor === 0n) {
    throw new Error("Division by zero");
  }

  const isNegative = value < 0n !== divisor < 0n;
  const absValue = value < 0n ? -value : value;
  const absDivisor = divisor < 0n ? -divisor : divisor;

  const quotient = absValue / absDivisor;
  const remainder = absValue % absDivisor;

  const result = remainder === 0n ? quotient : quotient + 1n;

  return isNegative ? -result : result;
}

/**
 * Round down (floor)
 *
 * @param value - The value to round
 * @param divisor - The divisor
 * @returns Quotient rounded down
 */
export function roundDown(value: bigint, divisor: bigint): bigint {
  if (divisor === 0n) {
    throw new Error("Division by zero");
  }

  const isNegative = value < 0n !== divisor < 0n;
  const absValue = value < 0n ? -value : value;
  const absDivisor = divisor < 0n ? -divisor : divisor;

  const result = absValue / absDivisor;

  return isNegative ? -result : result;
}

/**
 * Convert a bigint value from one scale to another
 *
 * @param value - Value to convert
 * @param fromScale - Current scale (decimal places)
 * @param toScale - Target scale (decimal places)
 * @param roundingMode - How to handle precision loss when scaling down (default: "truncate")
 * @returns Value at target scale
 *
 * @example
 * ```typescript
 * convertScale(100n, 2, 4)              // 10000n (1.00 → 1.0000)
 * convertScale(10050n, 4, 2, "round")   // 101n (1.0050 → 1.01)
 * convertScale(10050n, 4, 2, "truncate") // 100n (1.0050 → 1.00)
 * ```
 */
export function convertScale(
  value: bigint,
  fromScale: number,
  toScale: number,
  roundingMode: RoundingMode = "truncate",
): bigint {
  // Validate inputs
  ConvertScaleInputSchema.parse({ value, fromScale, toScale, roundingMode });

  if (fromScale === toScale) {
    return value;
  }

  if (fromScale < toScale) {
    // Scale up - no rounding needed
    const factor = 10n ** BigInt(toScale - fromScale);
    return value * factor;
  }

  // Scale down - may need rounding
  const divisor = 10n ** BigInt(fromScale - toScale);

  if (roundingMode === "truncate") {
    return value / divisor;
  } else if (roundingMode === "round") {
    return bankersRound(value, divisor);
  } else if (roundingMode === "ceil") {
    return roundUp(value, divisor);
  } else {
    // floor
    return roundDown(value, divisor);
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd libraries/bigint && bun test round`
Expected: All round tests PASS

**Step 5: Verify parse tests now pass**

Run: `cd libraries/bigint && bun test parse`
Expected: All parse tests PASS (now that round module exists)

**Step 6: Commit**

```bash
git add libraries/bigint/src/round.ts libraries/bigint/__tests__/round.test.ts
git commit -m "feat(bigint): add rounding utilities

- Add bankersRound for unbiased rounding
- Add roundUp and roundDown
- Add convertScale for scale conversion
- Parse module now fully functional"
```

---

## Task 5: Format Module

**Files:**
- Create: `libraries/bigint/src/format.ts`
- Create: `libraries/bigint/__tests__/format.test.ts`

**Step 1: Write failing format tests**

Create `libraries/bigint/__tests__/format.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { formatFromBigInt } from "../src/format";

describe("formatFromBigInt", () => {
  describe("basic formatting", () => {
    test("formats positive values", () => {
      expect(formatFromBigInt(1050n, 2)).toBe("10.5");
      expect(formatFromBigInt(12345n, 2)).toBe("123.45");
    });

    test("formats negative values", () => {
      expect(formatFromBigInt(-1050n, 2)).toBe("-10.5");
      expect(formatFromBigInt(-12345n, 2)).toBe("-123.45");
    });

    test("formats zero", () => {
      expect(formatFromBigInt(0n, 2)).toBe("0");
      expect(formatFromBigInt(0n, 0)).toBe("0");
    });

    test("formats integers (scale 0)", () => {
      expect(formatFromBigInt(100n, 0)).toBe("100");
      expect(formatFromBigInt(0n, 0)).toBe("0");
    });
  });

  describe("trailing zeros", () => {
    test("trims trailing zeros by default", () => {
      expect(formatFromBigInt(1000n, 2)).toBe("10");
      expect(formatFromBigInt(1050n, 2)).toBe("10.5");
      expect(formatFromBigInt(10500n, 4)).toBe("1.05");
    });

    test("preserves trailing zeros when requested", () => {
      expect(formatFromBigInt(1000n, 2, false)).toBe("10.00");
      expect(formatFromBigInt(1050n, 2, false)).toBe("10.50");
      expect(formatFromBigInt(10500n, 4, false)).toBe("1.0500");
    });
  });

  describe("padding and precision", () => {
    test("pads with zeros when value smaller than scale", () => {
      expect(formatFromBigInt(1n, 4)).toBe("0.0001");
      expect(formatFromBigInt(50n, 4)).toBe("0.005");
    });

    test("handles large scale", () => {
      expect(formatFromBigInt(1500000000000000000n, 18)).toBe("1.5");
    });

    test("handles very small values", () => {
      expect(formatFromBigInt(1n, 6)).toBe("0.000001");
    });
  });

  describe("edge cases", () => {
    test("handles very large numbers", () => {
      expect(formatFromBigInt(99999999999999999n, 2)).toBe("999999999999999.99");
    });

    test("formats negative zero as zero", () => {
      expect(formatFromBigInt(-0n, 2)).toBe("0");
    });
  });

  describe("validation", () => {
    test("throws on negative scale", () => {
      expect(() => formatFromBigInt(100n, -1)).toThrow();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd libraries/bigint && bun test format`
Expected: FAIL - format module not found

**Step 3: Implement format module**

Create `libraries/bigint/src/format.ts`:

```typescript
import { FormatInputSchema } from "./schemas";

/**
 * Format a BigInt value to a decimal string with specified scale
 *
 * @param value - The BigInt value
 * @param scale - The number of decimal places
 * @param trimTrailingZeros - Whether to remove trailing zeros (default: true)
 * @returns String representation as decimal number
 *
 * @example
 * ```typescript
 * formatFromBigInt(10500000000000n, 12)        // "10.5"
 * formatFromBigInt(25750000000000n, 12)        // "25.75"
 * formatFromBigInt(1000n, 2)                   // "10"
 * formatFromBigInt(1000n, 2, false)            // "10.00"
 * ```
 */
export function formatFromBigInt(
  value: bigint,
  scale: number,
  trimTrailingZeros: boolean = true,
): string {
  // Validate inputs
  FormatInputSchema.parse({ value, scale, trimTrailingZeros });

  // Handle scale 0 (integers)
  if (scale === 0) {
    return value.toString();
  }

  const isNegative = value < 0n;
  const absValue = isNegative ? -value : value;
  const valueStr = absValue.toString();

  // Pad with zeros if needed
  const paddedStr = valueStr.padStart(scale + 1, "0");

  // Split into integer and decimal parts
  const integerPart = paddedStr.slice(0, -scale) || "0";
  let decimalPart = paddedStr.slice(-scale);

  // Trim trailing zeros if requested
  if (trimTrailingZeros) {
    decimalPart = decimalPart.replace(/0+$/, "");
  }

  // Build result
  let result: string;
  if (decimalPart) {
    result = `${integerPart}.${decimalPart}`;
  } else {
    result = integerPart;
  }

  return isNegative ? `-${result}` : result;
}
```

**Step 4: Run tests to verify they pass**

Run: `cd libraries/bigint && bun test format`
Expected: All format tests PASS

**Step 5: Commit**

```bash
git add libraries/bigint/src/format.ts libraries/bigint/__tests__/format.test.ts
git commit -m "feat(bigint): add format module

- Add formatFromBigInt to convert bigint to decimal string
- Support trimming trailing zeros
- Handle padding for small values
- Add comprehensive format tests"
```

---

## Task 6: Arithmetic Module

**Files:**
- Create: `libraries/bigint/src/arithmetic.ts`
- Create: `libraries/bigint/__tests__/arithmetic.test.ts`

**Step 1: Write failing arithmetic tests**

Create `libraries/bigint/__tests__/arithmetic.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { add, subtract, multiply, divide, abs, min, max } from "../src/arithmetic";

describe("add", () => {
  test("adds two positive values", () => {
    expect(add(100n, 50n, 2)).toBe(150n);
    expect(add(12500n, 7500n, 2)).toBe(20000n);
  });

  test("adds positive and negative", () => {
    expect(add(100n, -50n, 2)).toBe(50n);
    expect(add(-100n, 50n, 2)).toBe(-50n);
  });

  test("adds two negative values", () => {
    expect(add(-100n, -50n, 2)).toBe(-150n);
  });

  test("handles zero", () => {
    expect(add(0n, 100n, 2)).toBe(100n);
    expect(add(100n, 0n, 2)).toBe(100n);
  });

  test("validates negative scale", () => {
    expect(() => add(100n, 50n, -1)).toThrow();
  });
});

describe("subtract", () => {
  test("subtracts two positive values", () => {
    expect(subtract(100n, 50n, 2)).toBe(50n);
    expect(subtract(50n, 100n, 2)).toBe(-50n);
  });

  test("subtracts with negatives", () => {
    expect(subtract(100n, -50n, 2)).toBe(150n);
    expect(subtract(-100n, 50n, 2)).toBe(-150n);
  });

  test("handles zero", () => {
    expect(subtract(100n, 0n, 2)).toBe(100n);
    expect(subtract(0n, 100n, 2)).toBe(-100n);
  });
});

describe("multiply", () => {
  test("multiplies two positive values", () => {
    // 10.00 * 5.00 @ scale 2 = 50.00
    expect(multiply(1000n, 500n, 2)).toBe(5000n);
  });

  test("multiplies with negative", () => {
    expect(multiply(1000n, -500n, 2)).toBe(-5000n);
    expect(multiply(-1000n, 500n, 2)).toBe(-5000n);
    expect(multiply(-1000n, -500n, 2)).toBe(5000n);
  });

  test("multiplies by zero", () => {
    expect(multiply(1000n, 0n, 2)).toBe(0n);
    expect(multiply(0n, 1000n, 2)).toBe(0n);
  });

  test("handles fractional multiplication", () => {
    // 1.5 * 2.0 @ scale 2 = 3.0
    expect(multiply(150n, 200n, 2)).toBe(300n);
  });
});

describe("divide", () => {
  test("divides evenly", () => {
    // 100.00 / 5.00 @ scale 2 = 20.00
    expect(divide(10000n, 500n, 2)).toBe(2000n);
  });

  test("divides with remainder (truncates by default)", () => {
    // 100 / 3 @ scale 2 = 33.33...
    expect(divide(10000n, 300n, 2)).toBe(3333n);
  });

  test("divides with rounding", () => {
    // 100 / 3 @ scale 2 with banker's rounding
    expect(divide(10000n, 300n, 2, "round")).toBe(3333n);
    // 10 / 3 @ scale 2 = 3.33..., rounds to 3.33
    expect(divide(1000n, 300n, 2, "round")).toBe(333n);
  });

  test("divides with ceil", () => {
    expect(divide(10000n, 300n, 2, "ceil")).toBe(3334n);
  });

  test("divides with floor", () => {
    expect(divide(10000n, 300n, 2, "floor")).toBe(3333n);
  });

  test("handles negative values", () => {
    expect(divide(-10000n, 300n, 2)).toBe(-3333n);
    expect(divide(10000n, -300n, 2)).toBe(-3333n);
    expect(divide(-10000n, -300n, 2)).toBe(3333n);
  });

  test("throws on division by zero", () => {
    expect(() => divide(10000n, 0n, 2)).toThrow();
  });
});

describe("abs", () => {
  test("returns absolute value", () => {
    expect(abs(100n, 2)).toBe(100n);
    expect(abs(-100n, 2)).toBe(100n);
    expect(abs(0n, 2)).toBe(0n);
  });
});

describe("min", () => {
  test("returns minimum of two values", () => {
    expect(min(100n, 50n, 2)).toBe(50n);
    expect(min(50n, 100n, 2)).toBe(50n);
    expect(min(-100n, 50n, 2)).toBe(-100n);
    expect(min(-50n, -100n, 2)).toBe(-100n);
  });

  test("handles equal values", () => {
    expect(min(100n, 100n, 2)).toBe(100n);
  });
});

describe("max", () => {
  test("returns maximum of two values", () => {
    expect(max(100n, 50n, 2)).toBe(100n);
    expect(max(50n, 100n, 2)).toBe(100n);
    expect(max(-100n, 50n, 2)).toBe(50n);
    expect(max(-50n, -100n, 2)).toBe(-50n);
  });

  test("handles equal values", () => {
    expect(max(100n, 100n, 2)).toBe(100n);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd libraries/bigint && bun test arithmetic`
Expected: FAIL - arithmetic module not found

**Step 3: Implement arithmetic module**

Create `libraries/bigint/src/arithmetic.ts`:

```typescript
import type { RoundingMode } from "./schemas";
import { ArithmeticInputSchema, DivideInputSchema } from "./schemas";
import { bankersRound, roundUp, roundDown } from "./round";

/**
 * Add two bigint values
 *
 * Both values must have the same scale.
 *
 * @param a - First value
 * @param b - Second value
 * @param scale - Scale (must be same for both values)
 * @returns Sum
 */
export function add(a: bigint, b: bigint, scale: number): bigint {
  ArithmeticInputSchema.parse({ a, b, scale });
  return a + b;
}

/**
 * Subtract two bigint values
 *
 * Both values must have the same scale.
 *
 * @param a - First value
 * @param b - Second value (subtracted from a)
 * @param scale - Scale (must be same for both values)
 * @returns Difference
 */
export function subtract(a: bigint, b: bigint, scale: number): bigint {
  ArithmeticInputSchema.parse({ a, b, scale });
  return a - b;
}

/**
 * Multiply two bigint values
 *
 * Both values must have the same scale. Result is scaled back to the same scale.
 *
 * @param a - First value
 * @param b - Second value
 * @param scale - Scale (must be same for both values)
 * @returns Product at same scale
 *
 * @example
 * ```typescript
 * // 10.00 * 5.00 @ scale 2 = 50.00
 * multiply(1000n, 500n, 2)  // 5000n
 * ```
 */
export function multiply(a: bigint, b: bigint, scale: number): bigint {
  ArithmeticInputSchema.parse({ a, b, scale });

  // Multiply the values
  const product = a * b;

  // Scale back down (dividing by 10^scale)
  const scaleFactor = 10n ** BigInt(scale);
  return product / scaleFactor;
}

/**
 * Divide two bigint values
 *
 * Both values must have the same scale. Result is at the same scale.
 *
 * @param a - Dividend
 * @param b - Divisor (must not be zero)
 * @param scale - Scale (must be same for both values)
 * @param roundingMode - How to handle remainder (default: "truncate")
 * @returns Quotient at same scale
 *
 * @example
 * ```typescript
 * // 100.00 / 3.00 @ scale 2 = 33.33 (truncated)
 * divide(10000n, 300n, 2)  // 3333n
 *
 * // With rounding
 * divide(10000n, 300n, 2, "round")  // 3333n (banker's rounding)
 * ```
 */
export function divide(
  a: bigint,
  b: bigint,
  scale: number,
  roundingMode: RoundingMode = "truncate",
): bigint {
  DivideInputSchema.parse({ a, b, scale, roundingMode });

  // Scale up the dividend to maintain precision
  const scaleFactor = 10n ** BigInt(scale);
  const scaledDividend = a * scaleFactor;

  // Perform division based on rounding mode
  if (roundingMode === "truncate") {
    return scaledDividend / b;
  } else if (roundingMode === "round") {
    return bankersRound(scaledDividend, b);
  } else if (roundingMode === "ceil") {
    return roundUp(scaledDividend, b);
  } else {
    // floor
    return roundDown(scaledDividend, b);
  }
}

/**
 * Get absolute value
 *
 * @param value - The value
 * @param scale - Scale
 * @returns Absolute value
 */
export function abs(value: bigint, scale: number): bigint {
  ArithmeticInputSchema.parse({ a: value, b: 0n, scale });
  return value < 0n ? -value : value;
}

/**
 * Get minimum of two values
 *
 * @param a - First value
 * @param b - Second value
 * @param scale - Scale (must be same for both values)
 * @returns Minimum value
 */
export function min(a: bigint, b: bigint, scale: number): bigint {
  ArithmeticInputSchema.parse({ a, b, scale });
  return a < b ? a : b;
}

/**
 * Get maximum of two values
 *
 * @param a - First value
 * @param b - Second value
 * @param scale - Scale (must be same for both values)
 * @returns Maximum value
 */
export function max(a: bigint, b: bigint, scale: number): bigint {
  ArithmeticInputSchema.parse({ a, b, scale });
  return a > b ? a : b;
}
```

**Step 4: Run tests to verify they pass**

Run: `cd libraries/bigint && bun test arithmetic`
Expected: All arithmetic tests PASS

**Step 5: Commit**

```bash
git add libraries/bigint/src/arithmetic.ts libraries/bigint/__tests__/arithmetic.test.ts
git commit -m "feat(bigint): add arithmetic operations

- Add add, subtract, multiply, divide
- Add abs, min, max utilities
- All operations require same scale
- Division supports all rounding modes"
```

---

## Task 7: Compare Module

**Files:**
- Create: `libraries/bigint/src/compare.ts`
- Create: `libraries/bigint/__tests__/compare.test.ts`

**Step 1: Write failing comparison tests**

Create `libraries/bigint/__tests__/compare.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import {
  compare,
  equals,
  greaterThan,
  greaterThanOrEqual,
  lessThan,
  lessThanOrEqual,
  isZero,
  isPositive,
  isNegative,
} from "../src/compare";

describe("compare", () => {
  test("returns -1 when a < b", () => {
    expect(compare(50n, 100n, 2)).toBe(-1);
    expect(compare(-100n, 50n, 2)).toBe(-1);
  });

  test("returns 0 when a === b", () => {
    expect(compare(100n, 100n, 2)).toBe(0);
    expect(compare(0n, 0n, 2)).toBe(0);
    expect(compare(-100n, -100n, 2)).toBe(0);
  });

  test("returns 1 when a > b", () => {
    expect(compare(100n, 50n, 2)).toBe(1);
    expect(compare(50n, -100n, 2)).toBe(1);
  });

  test("validates scale", () => {
    expect(() => compare(100n, 50n, -1)).toThrow();
  });
});

describe("equals", () => {
  test("returns true when equal", () => {
    expect(equals(100n, 100n, 2)).toBe(true);
    expect(equals(0n, 0n, 2)).toBe(true);
    expect(equals(-100n, -100n, 2)).toBe(true);
  });

  test("returns false when not equal", () => {
    expect(equals(100n, 50n, 2)).toBe(false);
    expect(equals(100n, -100n, 2)).toBe(false);
  });
});

describe("greaterThan", () => {
  test("returns true when a > b", () => {
    expect(greaterThan(100n, 50n, 2)).toBe(true);
    expect(greaterThan(50n, -100n, 2)).toBe(true);
  });

  test("returns false when a <= b", () => {
    expect(greaterThan(50n, 100n, 2)).toBe(false);
    expect(greaterThan(100n, 100n, 2)).toBe(false);
  });
});

describe("greaterThanOrEqual", () => {
  test("returns true when a >= b", () => {
    expect(greaterThanOrEqual(100n, 50n, 2)).toBe(true);
    expect(greaterThanOrEqual(100n, 100n, 2)).toBe(true);
  });

  test("returns false when a < b", () => {
    expect(greaterThanOrEqual(50n, 100n, 2)).toBe(false);
  });
});

describe("lessThan", () => {
  test("returns true when a < b", () => {
    expect(lessThan(50n, 100n, 2)).toBe(true);
    expect(lessThan(-100n, 50n, 2)).toBe(true);
  });

  test("returns false when a >= b", () => {
    expect(lessThan(100n, 50n, 2)).toBe(false);
    expect(lessThan(100n, 100n, 2)).toBe(false);
  });
});

describe("lessThanOrEqual", () => {
  test("returns true when a <= b", () => {
    expect(lessThanOrEqual(50n, 100n, 2)).toBe(true);
    expect(lessThanOrEqual(100n, 100n, 2)).toBe(true);
  });

  test("returns false when a > b", () => {
    expect(lessThanOrEqual(100n, 50n, 2)).toBe(false);
  });
});

describe("isZero", () => {
  test("returns true for zero", () => {
    expect(isZero(0n, 2)).toBe(true);
  });

  test("returns false for non-zero", () => {
    expect(isZero(1n, 2)).toBe(false);
    expect(isZero(-1n, 2)).toBe(false);
  });
});

describe("isPositive", () => {
  test("returns true for positive values", () => {
    expect(isPositive(100n, 2)).toBe(true);
    expect(isPositive(1n, 2)).toBe(true);
  });

  test("returns false for zero and negative", () => {
    expect(isPositive(0n, 2)).toBe(false);
    expect(isPositive(-100n, 2)).toBe(false);
  });
});

describe("isNegative", () => {
  test("returns true for negative values", () => {
    expect(isNegative(-100n, 2)).toBe(true);
    expect(isNegative(-1n, 2)).toBe(true);
  });

  test("returns false for zero and positive", () => {
    expect(isNegative(0n, 2)).toBe(false);
    expect(isNegative(100n, 2)).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd libraries/bigint && bun test compare`
Expected: FAIL - compare module not found

**Step 3: Implement compare module**

Create `libraries/bigint/src/compare.ts`:

```typescript
import { ArithmeticInputSchema } from "./schemas";

/**
 * Compare two bigint values
 *
 * @param a - First value
 * @param b - Second value
 * @param scale - Scale (must be same for both values)
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compare(a: bigint, b: bigint, scale: number): -1 | 0 | 1 {
  ArithmeticInputSchema.parse({ a, b, scale });

  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Check if two bigint values are equal
 *
 * @param a - First value
 * @param b - Second value
 * @param scale - Scale (must be same for both values)
 * @returns True if equal
 */
export function equals(a: bigint, b: bigint, scale: number): boolean {
  ArithmeticInputSchema.parse({ a, b, scale });
  return a === b;
}

/**
 * Check if a > b
 *
 * @param a - First value
 * @param b - Second value
 * @param scale - Scale (must be same for both values)
 * @returns True if a > b
 */
export function greaterThan(a: bigint, b: bigint, scale: number): boolean {
  ArithmeticInputSchema.parse({ a, b, scale });
  return a > b;
}

/**
 * Check if a >= b
 *
 * @param a - First value
 * @param b - Second value
 * @param scale - Scale (must be same for both values)
 * @returns True if a >= b
 */
export function greaterThanOrEqual(a: bigint, b: bigint, scale: number): boolean {
  ArithmeticInputSchema.parse({ a, b, scale });
  return a >= b;
}

/**
 * Check if a < b
 *
 * @param a - First value
 * @param b - Second value
 * @param scale - Scale (must be same for both values)
 * @returns True if a < b
 */
export function lessThan(a: bigint, b: bigint, scale: number): boolean {
  ArithmeticInputSchema.parse({ a, b, scale });
  return a < b;
}

/**
 * Check if a <= b
 *
 * @param a - First value
 * @param b - Second value
 * @param scale - Scale (must be same for both values)
 * @returns True if a <= b
 */
export function lessThanOrEqual(a: bigint, b: bigint, scale: number): boolean {
  ArithmeticInputSchema.parse({ a, b, scale });
  return a <= b;
}

/**
 * Check if value is zero
 *
 * @param value - The value to check
 * @param scale - Scale
 * @returns True if value is zero
 */
export function isZero(value: bigint, scale: number): boolean {
  ArithmeticInputSchema.parse({ a: value, b: 0n, scale });
  return value === 0n;
}

/**
 * Check if value is positive (> 0)
 *
 * @param value - The value to check
 * @param scale - Scale
 * @returns True if value is positive
 */
export function isPositive(value: bigint, scale: number): boolean {
  ArithmeticInputSchema.parse({ a: value, b: 0n, scale });
  return value > 0n;
}

/**
 * Check if value is negative (< 0)
 *
 * @param value - The value to check
 * @param scale - Scale
 * @returns True if value is negative
 */
export function isNegative(value: bigint, scale: number): boolean {
  ArithmeticInputSchema.parse({ a: value, b: 0n, scale });
  return value < 0n;
}
```

**Step 4: Run tests to verify they pass**

Run: `cd libraries/bigint && bun test compare`
Expected: All comparison tests PASS

**Step 5: Commit**

```bash
git add libraries/bigint/src/compare.ts libraries/bigint/__tests__/compare.test.ts
git commit -m "feat(bigint): add comparison operations

- Add compare, equals, greaterThan, lessThan, etc.
- Add isZero, isPositive, isNegative
- All operations require same scale"
```

---

## Task 8: Main Index Exports

**Files:**
- Modify: `libraries/bigint/src/index.ts`

**Step 1: Update main index with all exports**

```typescript
// Parsing
export { parseToBigInt } from "./parse";

// Formatting
export { formatFromBigInt } from "./format";

// Arithmetic operations
export { add, subtract, multiply, divide, abs, min, max } from "./arithmetic";

// Comparison operations
export {
  compare,
  equals,
  greaterThan,
  greaterThanOrEqual,
  lessThan,
  lessThanOrEqual,
  isZero,
  isPositive,
  isNegative,
} from "./compare";

// Rounding operations
export { bankersRound, roundUp, roundDown, convertScale } from "./round";

// Schemas
export {
  RoundingModeSchema,
  ScaleSchema,
  DecimalStringSchema,
  BigIntValueSchema,
  ParseInputSchema,
  ArithmeticInputSchema,
  DivideInputSchema,
  ConvertScaleInputSchema,
  FormatInputSchema,
  ScaledBigIntSchema,
} from "./schemas";

// Types
export type {
  RoundingMode,
  ParseInput,
  ArithmeticInput,
  DivideInput,
  ConvertScaleInput,
  FormatInput,
  ScaledBigInt,
} from "./schemas";
```

**Step 2: Build the library**

Run: `cd libraries/bigint && bun run build`
Expected: Build succeeds, generates dist/ with index.js and index.d.ts

**Step 3: Run all tests**

Run: `cd libraries/bigint && bun test`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add libraries/bigint/src/index.ts
git commit -m "feat(bigint): export all core modules

- Export parse, format, arithmetic, compare, round
- Export all schemas and types
- Library core is complete"
```

---

## Task 9: Condition-Evaluator Operators - Comparison

**Files:**
- Create: `libraries/bigint/src/plugins/operators/comparison.ts`
- Create: `libraries/bigint/__tests__/operators-comparison.test.ts`

**Step 1: Write failing operator tests**

Create `libraries/bigint/__tests__/operators-comparison.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import {
  bigintEqualsOperator,
  bigintNotEqualsOperator,
  bigintGreaterThanOperator,
  bigintGreaterThanOrEqualOperator,
  bigintLessThanOperator,
  bigintLessThanOrEqualOperator,
} from "../src/plugins/operators/comparison";

describe("bigintEqualsOperator", () => {
  test("returns true when values are equal", () => {
    const actual = { value: 100n, scale: 2 };
    const expected = { value: 100n, scale: 2 };
    expect(bigintEqualsOperator.evaluate(actual, expected)).toBe(true);
  });

  test("returns false when values differ", () => {
    const actual = { value: 100n, scale: 2 };
    const expected = { value: 50n, scale: 2 };
    expect(bigintEqualsOperator.evaluate(actual, expected)).toBe(false);
  });

  test("throws on scale mismatch", () => {
    const actual = { value: 100n, scale: 2 };
    const expected = { value: 100n, scale: 4 };
    expect(() => bigintEqualsOperator.evaluate(actual, expected)).toThrow();
  });

  test("validates input schema", () => {
    expect(() => bigintEqualsOperator.evaluate("invalid", { value: 100n, scale: 2 })).toThrow();
  });
});

describe("bigintNotEqualsOperator", () => {
  test("returns true when values differ", () => {
    const actual = { value: 100n, scale: 2 };
    const expected = { value: 50n, scale: 2 };
    expect(bigintNotEqualsOperator.evaluate(actual, expected)).toBe(true);
  });

  test("returns false when values are equal", () => {
    const actual = { value: 100n, scale: 2 };
    const expected = { value: 100n, scale: 2 };
    expect(bigintNotEqualsOperator.evaluate(actual, expected)).toBe(false);
  });
});

describe("bigintGreaterThanOperator", () => {
  test("returns true when actual > expected", () => {
    const actual = { value: 100n, scale: 2 };
    const expected = { value: 50n, scale: 2 };
    expect(bigintGreaterThanOperator.evaluate(actual, expected)).toBe(true);
  });

  test("returns false when actual <= expected", () => {
    const actual = { value: 50n, scale: 2 };
    const expected = { value: 100n, scale: 2 };
    expect(bigintGreaterThanOperator.evaluate(actual, expected)).toBe(false);

    const equal1 = { value: 100n, scale: 2 };
    const equal2 = { value: 100n, scale: 2 };
    expect(bigintGreaterThanOperator.evaluate(equal1, equal2)).toBe(false);
  });
});

describe("bigintGreaterThanOrEqualOperator", () => {
  test("returns true when actual >= expected", () => {
    const actual1 = { value: 100n, scale: 2 };
    const expected1 = { value: 50n, scale: 2 };
    expect(bigintGreaterThanOrEqualOperator.evaluate(actual1, expected1)).toBe(true);

    const actual2 = { value: 100n, scale: 2 };
    const expected2 = { value: 100n, scale: 2 };
    expect(bigintGreaterThanOrEqualOperator.evaluate(actual2, expected2)).toBe(true);
  });

  test("returns false when actual < expected", () => {
    const actual = { value: 50n, scale: 2 };
    const expected = { value: 100n, scale: 2 };
    expect(bigintGreaterThanOrEqualOperator.evaluate(actual, expected)).toBe(false);
  });
});

describe("bigintLessThanOperator", () => {
  test("returns true when actual < expected", () => {
    const actual = { value: 50n, scale: 2 };
    const expected = { value: 100n, scale: 2 };
    expect(bigintLessThanOperator.evaluate(actual, expected)).toBe(true);
  });

  test("returns false when actual >= expected", () => {
    const actual = { value: 100n, scale: 2 };
    const expected = { value: 50n, scale: 2 };
    expect(bigintLessThanOperator.evaluate(actual, expected)).toBe(false);

    const equal1 = { value: 100n, scale: 2 };
    const equal2 = { value: 100n, scale: 2 };
    expect(bigintLessThanOperator.evaluate(equal1, equal2)).toBe(false);
  });
});

describe("bigintLessThanOrEqualOperator", () => {
  test("returns true when actual <= expected", () => {
    const actual1 = { value: 50n, scale: 2 };
    const expected1 = { value: 100n, scale: 2 };
    expect(bigintLessThanOrEqualOperator.evaluate(actual1, expected1)).toBe(true);

    const actual2 = { value: 100n, scale: 2 };
    const expected2 = { value: 100n, scale: 2 };
    expect(bigintLessThanOrEqualOperator.evaluate(actual2, expected2)).toBe(true);
  });

  test("returns false when actual > expected", () => {
    const actual = { value: 100n, scale: 2 };
    const expected = { value: 50n, scale: 2 };
    expect(bigintLessThanOrEqualOperator.evaluate(actual, expected)).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd libraries/bigint && bun test operators-comparison`
Expected: FAIL - operators module not found

**Step 3: Implement comparison operators**

Create `libraries/bigint/src/plugins/operators/comparison.ts`:

```typescript
import { createOperator } from "@f-o-t/condition-evaluator";
import { compare, equals } from "../../compare";
import { ScaledBigIntSchema, type ScaledBigInt } from "../../schemas";

/**
 * Helper to validate and extract scaled bigint
 */
function toScaledBigInt(value: unknown): ScaledBigInt {
  return ScaledBigIntSchema.parse(value);
}

/**
 * Validate that two scaled bigints have the same scale
 */
function assertSameScale(a: ScaledBigInt, b: ScaledBigInt): void {
  if (a.scale !== b.scale) {
    throw new Error(
      `Scale mismatch: ${a.scale} !== ${b.scale}. Values must have the same scale for comparison.`
    );
  }
}

/**
 * BigInt equals operator
 */
export const bigintEqualsOperator = createOperator({
  name: "bigint_eq",
  type: "custom",
  description: "Check if two scaled bigint values are equal",
  evaluate: (actual: unknown, expected: unknown): boolean => {
    const a = toScaledBigInt(actual);
    const b = toScaledBigInt(expected);
    assertSameScale(a, b);
    return equals(a.value, b.value, a.scale);
  },
  valueSchema: ScaledBigIntSchema,
});

/**
 * BigInt not equals operator
 */
export const bigintNotEqualsOperator = createOperator({
  name: "bigint_neq",
  type: "custom",
  description: "Check if two scaled bigint values are not equal",
  evaluate: (actual: unknown, expected: unknown): boolean => {
    const a = toScaledBigInt(actual);
    const b = toScaledBigInt(expected);
    assertSameScale(a, b);
    return !equals(a.value, b.value, a.scale);
  },
  valueSchema: ScaledBigIntSchema,
});

/**
 * BigInt greater than operator
 */
export const bigintGreaterThanOperator = createOperator({
  name: "bigint_gt",
  type: "custom",
  description: "Check if bigint value is greater than expected",
  evaluate: (actual: unknown, expected: unknown): boolean => {
    const a = toScaledBigInt(actual);
    const b = toScaledBigInt(expected);
    assertSameScale(a, b);
    return compare(a.value, b.value, a.scale) > 0;
  },
  valueSchema: ScaledBigIntSchema,
});

/**
 * BigInt greater than or equal operator
 */
export const bigintGreaterThanOrEqualOperator = createOperator({
  name: "bigint_gte",
  type: "custom",
  description: "Check if bigint value is greater than or equal to expected",
  evaluate: (actual: unknown, expected: unknown): boolean => {
    const a = toScaledBigInt(actual);
    const b = toScaledBigInt(expected);
    assertSameScale(a, b);
    return compare(a.value, b.value, a.scale) >= 0;
  },
  valueSchema: ScaledBigIntSchema,
});

/**
 * BigInt less than operator
 */
export const bigintLessThanOperator = createOperator({
  name: "bigint_lt",
  type: "custom",
  description: "Check if bigint value is less than expected",
  evaluate: (actual: unknown, expected: unknown): boolean => {
    const a = toScaledBigInt(actual);
    const b = toScaledBigInt(expected);
    assertSameScale(a, b);
    return compare(a.value, b.value, a.scale) < 0;
  },
  valueSchema: ScaledBigIntSchema,
});

/**
 * BigInt less than or equal operator
 */
export const bigintLessThanOrEqualOperator = createOperator({
  name: "bigint_lte",
  type: "custom",
  description: "Check if bigint value is less than or equal to expected",
  evaluate: (actual: unknown, expected: unknown): boolean => {
    const a = toScaledBigInt(actual);
    const b = toScaledBigInt(expected);
    assertSameScale(a, b);
    return compare(a.value, b.value, a.scale) <= 0;
  },
  valueSchema: ScaledBigIntSchema,
});
```

**Step 4: Run tests to verify they pass**

Run: `cd libraries/bigint && bun test operators-comparison`
Expected: All comparison operator tests PASS

**Step 5: Commit**

```bash
git add libraries/bigint/src/plugins/operators/comparison.ts libraries/bigint/__tests__/operators-comparison.test.ts
git commit -m "feat(bigint): add comparison operators for condition-evaluator

- Add bigint_eq, bigint_neq, bigint_gt, bigint_gte, bigint_lt, bigint_lte
- Validate same scale requirement
- Full test coverage"
```

---

## Task 10: Condition-Evaluator Operators - Range

**Files:**
- Create: `libraries/bigint/src/plugins/operators/range.ts`
- Create: `libraries/bigint/__tests__/operators-range.test.ts`

**Step 1: Write failing range operator tests**

Create `libraries/bigint/__tests__/operators-range.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import {
  bigintBetweenOperator,
  bigintIsZeroOperator,
  bigintIsPositiveOperator,
  bigintIsNegativeOperator,
} from "../src/plugins/operators/range";

describe("bigintBetweenOperator", () => {
  test("returns true when value is between min and max", () => {
    const actual = { value: 50n, scale: 2 };
    const range = {
      min: { value: 0n, scale: 2 },
      max: { value: 100n, scale: 2 },
    };
    expect(bigintBetweenOperator.evaluate(actual, range)).toBe(true);
  });

  test("returns true when value equals min", () => {
    const actual = { value: 0n, scale: 2 };
    const range = {
      min: { value: 0n, scale: 2 },
      max: { value: 100n, scale: 2 },
    };
    expect(bigintBetweenOperator.evaluate(actual, range)).toBe(true);
  });

  test("returns true when value equals max", () => {
    const actual = { value: 100n, scale: 2 };
    const range = {
      min: { value: 0n, scale: 2 },
      max: { value: 100n, scale: 2 },
    };
    expect(bigintBetweenOperator.evaluate(actual, range)).toBe(true);
  });

  test("returns false when value is below min", () => {
    const actual = { value: -10n, scale: 2 };
    const range = {
      min: { value: 0n, scale: 2 },
      max: { value: 100n, scale: 2 },
    };
    expect(bigintBetweenOperator.evaluate(actual, range)).toBe(false);
  });

  test("returns false when value is above max", () => {
    const actual = { value: 150n, scale: 2 };
    const range = {
      min: { value: 0n, scale: 2 },
      max: { value: 100n, scale: 2 },
    };
    expect(bigintBetweenOperator.evaluate(actual, range)).toBe(false);
  });

  test("throws on scale mismatch", () => {
    const actual = { value: 50n, scale: 2 };
    const range = {
      min: { value: 0n, scale: 4 },
      max: { value: 100n, scale: 2 },
    };
    expect(() => bigintBetweenOperator.evaluate(actual, range)).toThrow();
  });
});

describe("bigintIsZeroOperator", () => {
  test("returns true for zero", () => {
    const actual = { value: 0n, scale: 2 };
    expect(bigintIsZeroOperator.evaluate(actual, true)).toBe(true);
  });

  test("returns false for non-zero", () => {
    const actual = { value: 1n, scale: 2 };
    expect(bigintIsZeroOperator.evaluate(actual, true)).toBe(false);

    const negative = { value: -1n, scale: 2 };
    expect(bigintIsZeroOperator.evaluate(negative, true)).toBe(false);
  });

  test("can check for non-zero", () => {
    const actual = { value: 100n, scale: 2 };
    expect(bigintIsZeroOperator.evaluate(actual, false)).toBe(true);

    const zero = { value: 0n, scale: 2 };
    expect(bigintIsZeroOperator.evaluate(zero, false)).toBe(false);
  });
});

describe("bigintIsPositiveOperator", () => {
  test("returns true for positive values", () => {
    const actual = { value: 100n, scale: 2 };
    expect(bigintIsPositiveOperator.evaluate(actual, true)).toBe(true);
  });

  test("returns false for zero and negative", () => {
    const zero = { value: 0n, scale: 2 };
    expect(bigintIsPositiveOperator.evaluate(zero, true)).toBe(false);

    const negative = { value: -100n, scale: 2 };
    expect(bigintIsPositiveOperator.evaluate(negative, true)).toBe(false);
  });

  test("can check for non-positive", () => {
    const zero = { value: 0n, scale: 2 };
    expect(bigintIsPositiveOperator.evaluate(zero, false)).toBe(true);

    const positive = { value: 100n, scale: 2 };
    expect(bigintIsPositiveOperator.evaluate(positive, false)).toBe(false);
  });
});

describe("bigintIsNegativeOperator", () => {
  test("returns true for negative values", () => {
    const actual = { value: -100n, scale: 2 };
    expect(bigintIsNegativeOperator.evaluate(actual, true)).toBe(true);
  });

  test("returns false for zero and positive", () => {
    const zero = { value: 0n, scale: 2 };
    expect(bigintIsNegativeOperator.evaluate(zero, true)).toBe(false);

    const positive = { value: 100n, scale: 2 };
    expect(bigintIsNegativeOperator.evaluate(positive, true)).toBe(false);
  });

  test("can check for non-negative", () => {
    const zero = { value: 0n, scale: 2 };
    expect(bigintIsNegativeOperator.evaluate(zero, false)).toBe(true);

    const negative = { value: -100n, scale: 2 };
    expect(bigintIsNegativeOperator.evaluate(negative, false)).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd libraries/bigint && bun test operators-range`
Expected: FAIL - range operators module not found

**Step 3: Implement range operators**

Create `libraries/bigint/src/plugins/operators/range.ts`:

```typescript
import { z } from "zod";
import { createOperator } from "@f-o-t/condition-evaluator";
import { compare } from "../../compare";
import { isZero, isPositive, isNegative } from "../../compare";
import { ScaledBigIntSchema, type ScaledBigInt } from "../../schemas";

/**
 * Helper to validate and extract scaled bigint
 */
function toScaledBigInt(value: unknown): ScaledBigInt {
  return ScaledBigIntSchema.parse(value);
}

/**
 * BigInt between operator (inclusive range)
 */
export const bigintBetweenOperator = createOperator({
  name: "bigint_between",
  type: "custom",
  description: "Check if bigint value is between min and max (inclusive)",
  evaluate: (actual: unknown, expected: unknown): boolean => {
    const value = toScaledBigInt(actual);
    const range = z
      .object({
        min: ScaledBigIntSchema,
        max: ScaledBigIntSchema,
      })
      .parse(expected);

    // All must have same scale
    if (value.scale !== range.min.scale || value.scale !== range.max.scale) {
      throw new Error(
        `Scale mismatch in between comparison. All values must have the same scale.`
      );
    }

    return (
      compare(value.value, range.min.value, value.scale) >= 0 &&
      compare(value.value, range.max.value, value.scale) <= 0
    );
  },
  valueSchema: z.object({
    min: ScaledBigIntSchema,
    max: ScaledBigIntSchema,
  }),
});

/**
 * BigInt is zero operator
 */
export const bigintIsZeroOperator = createOperator({
  name: "bigint_zero",
  type: "custom",
  description: "Check if bigint value is zero (or non-zero if expected is false)",
  evaluate: (actual: unknown, expected: unknown): boolean => {
    const value = toScaledBigInt(actual);
    const shouldBeZero = z.boolean().parse(expected);

    const valueIsZero = isZero(value.value, value.scale);
    return shouldBeZero ? valueIsZero : !valueIsZero;
  },
  valueSchema: z.boolean(),
});

/**
 * BigInt is positive operator
 */
export const bigintIsPositiveOperator = createOperator({
  name: "bigint_positive",
  type: "custom",
  description: "Check if bigint value is positive (or non-positive if expected is false)",
  evaluate: (actual: unknown, expected: unknown): boolean => {
    const value = toScaledBigInt(actual);
    const shouldBePositive = z.boolean().parse(expected);

    const valueIsPositive = isPositive(value.value, value.scale);
    return shouldBePositive ? valueIsPositive : !valueIsPositive;
  },
  valueSchema: z.boolean(),
});

/**
 * BigInt is negative operator
 */
export const bigintIsNegativeOperator = createOperator({
  name: "bigint_negative",
  type: "custom",
  description: "Check if bigint value is negative (or non-negative if expected is false)",
  evaluate: (actual: unknown, expected: unknown): boolean => {
    const value = toScaledBigInt(actual);
    const shouldBeNegative = z.boolean().parse(expected);

    const valueIsNegative = isNegative(value.value, value.scale);
    return shouldBeNegative ? valueIsNegative : !valueIsNegative;
  },
  valueSchema: z.boolean(),
});
```

**Step 4: Run tests to verify they pass**

Run: `cd libraries/bigint && bun test operators-range`
Expected: All range operator tests PASS

**Step 5: Commit**

```bash
git add libraries/bigint/src/plugins/operators/range.ts libraries/bigint/__tests__/operators-range.test.ts
git commit -m "feat(bigint): add range operators for condition-evaluator

- Add bigint_between for inclusive range checks
- Add bigint_zero, bigint_positive, bigint_negative
- Full test coverage"
```

---

## Task 11: Operators Index and Plugin Export

**Files:**
- Create: `libraries/bigint/src/plugins/operators/index.ts`

**Step 1: Create operators index**

Create `libraries/bigint/src/plugins/operators/index.ts`:

```typescript
/**
 * BigInt operators for @f-o-t/condition-evaluator integration
 *
 * Import individual operators to register with an evaluator:
 *
 * @example
 * import { createEvaluator } from "@f-o-t/condition-evaluator";
 * import { bigintEqualsOperator, bigintGreaterThanOperator } from "@f-o-t/bigint/operators";
 *
 * const evaluator = createEvaluator({
 *    operators: {
 *       bigint_eq: bigintEqualsOperator,
 *       bigint_gt: bigintGreaterThanOperator,
 *    }
 * });
 *
 * evaluator.evaluate({
 *    type: "custom",
 *    field: "measurement",
 *    operator: "bigint_gt",
 *    value: { value: 100n, scale: 2 }
 * }, { data: { measurement: { value: 150n, scale: 2 } } });
 */

// Re-export comparison operators
export {
  bigintEqualsOperator,
  bigintNotEqualsOperator,
  bigintGreaterThanOperator,
  bigintGreaterThanOrEqualOperator,
  bigintLessThanOperator,
  bigintLessThanOrEqualOperator,
} from "./comparison";

// Re-export range operators
export {
  bigintBetweenOperator,
  bigintIsZeroOperator,
  bigintIsPositiveOperator,
  bigintIsNegativeOperator,
} from "./range";
```

**Step 2: Build with plugin**

Run: `cd libraries/bigint && bun run build`
Expected: Build succeeds, generates dist/plugins/operators/index.js

**Step 3: Verify plugin export works**

Create a quick test file `test-plugin-export.ts`:
```typescript
import { bigintEqualsOperator } from "./dist/plugins/operators/index.js";
console.log("Plugin export works:", bigintEqualsOperator.name);
```

Run: `bun run test-plugin-export.ts`
Expected: "Plugin export works: bigint_eq"

Delete test file: `rm test-plugin-export.ts`

**Step 4: Commit**

```bash
git add libraries/bigint/src/plugins/operators/index.ts
git commit -m "feat(bigint): add operators plugin export

- Create operators/index.ts with all operators
- Plugin exports at /operators path
- Operators ready for condition-evaluator integration"
```

---

## Task 12: Documentation and Final Testing

**Files:**
- Modify: `libraries/bigint/README.md`

**Step 1: Update README with comprehensive documentation**

```markdown
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
const value1 = parseToBigInt("10.50", 2);  // 1050n (scale 2)
const value2 = parseToBigInt("123.456", 3); // 123456n (scale 3)

// Different rounding modes
parseToBigInt("10.999", 2, "truncate");  // 1099n (default)
parseToBigInt("10.999", 2, "round");     // 1100n (banker's rounding)
parseToBigInt("10.999", 2, "ceil");      // 1100n (round up)
parseToBigInt("10.999", 2, "floor");     // 1099n (round down)
```

### Formatting

```typescript
import { formatFromBigInt } from "@f-o-t/bigint";

// Format bigint to decimal string
formatFromBigInt(1050n, 2);        // "10.5" (trims trailing zeros)
formatFromBigInt(1050n, 2, false); // "10.50" (keeps trailing zeros)
formatFromBigInt(100n, 0);         // "100" (no decimals)
```

### Arithmetic

All arithmetic operations require the same scale for both operands.

```typescript
import { add, subtract, multiply, divide } from "@f-o-t/bigint";

// Addition and subtraction
add(1050n, 525n, 2);       // 1575n (10.50 + 5.25 = 15.75)
subtract(1050n, 525n, 2);  // 525n (10.50 - 5.25 = 5.25)

// Multiplication (result maintains scale)
multiply(1000n, 500n, 2);  // 5000n (10.00 * 5.00 = 50.00)

// Division with rounding
divide(10000n, 300n, 2);            // 3333n (truncate, default)
divide(10000n, 300n, 2, "round");   // 3333n (banker's rounding)
divide(10000n, 300n, 2, "ceil");    // 3334n
```

### Comparison

```typescript
import { compare, equals, greaterThan, lessThan } from "@f-o-t/bigint";

compare(100n, 50n, 2);     // 1 (greater)
compare(50n, 100n, 2);     // -1 (less)
compare(100n, 100n, 2);    // 0 (equal)

equals(100n, 100n, 2);     // true
greaterThan(100n, 50n, 2); // true
lessThan(50n, 100n, 2);    // true
```

### Rounding & Scale Conversion

```typescript
import { bankersRound, convertScale } from "@f-o-t/bigint";

// Banker's rounding (round half to even)
bankersRound(25n, 10n);  // 2n (2.5 → 2, even)
bankersRound(35n, 10n);  // 4n (3.5 → 4, even)

// Convert between scales
convertScale(100n, 2, 4);              // 10000n (1.00 @ 2 → 1.0000 @ 4)
convertScale(10050n, 4, 2, "round");   // 101n (1.0050 @ 4 → 1.01 @ 2)
convertScale(10050n, 4, 2, "truncate"); // 100n (1.0050 @ 4 → 1.00 @ 2)
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
```

**Step 2: Run full test suite**

Run: `cd libraries/bigint && bun test`
Expected: All tests PASS

**Step 3: Run type checking**

Run: `cd libraries/bigint && bun run check`
Expected: Type check passes, all tests pass

**Step 4: Build final version**

Run: `cd libraries/bigint && bun run build`
Expected: Clean build with no errors

**Step 5: Commit**

```bash
git add libraries/bigint/README.md
git commit -m "docs(bigint): add comprehensive README

- Document all core features
- Add usage examples for all modules
- Document condition-evaluator integration
- Add operator reference table
- Library is complete and ready for use"
```

---

## Task 13: Library Migration Planning

**Files:**
- Create: `docs/plans/2026-02-01-migrate-money-uom-to-bigint.md`

**Step 1: Create migration plan document**

Create `docs/plans/2026-02-01-migrate-money-uom-to-bigint.md`:

```markdown
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
```

**Step 2: Commit migration plan**

```bash
git add docs/plans/2026-02-01-migrate-money-uom-to-bigint.md
git commit -m "docs: add migration plan for money and uom libraries

- Document strategy for adopting @f-o-t/bigint
- Phase-by-phase migration approach
- Testing checklist and rollback plan"
```

---

## Final Task: Wrap Up

**Step 1: Add library to workspace**

If there's a root package.json workspaces config, verify bigint is included:
```json
{
  "workspaces": [
    "libraries/*"
  ]
}
```

**Step 2: Install from root**

Run: `cd /home/yorizel/Documents/fot-libraries && bun install`
Expected: Workspace recognizes new bigint library

**Step 3: Final verification**

Run: `cd libraries/bigint && bun run check`
Expected: All tests pass, types check out

**Step 4: Final commit**

```bash
git add .
git commit -m "feat(bigint): complete library implementation

✅ Core modules: parse, format, arithmetic, compare, round
✅ Zod validation throughout
✅ Condition-evaluator operators plugin
✅ Comprehensive test coverage
✅ Full documentation
✅ Ready for adoption by money and uom libraries"
```

---

## Summary

**Completed:**
1. ✅ Project scaffolding with fot.config.ts
2. ✅ Zod schemas for all operations
3. ✅ Parse module with all rounding modes
4. ✅ Round module (banker's, ceil, floor, truncate)
5. ✅ Format module with trailing zero control
6. ✅ Arithmetic module (add, subtract, multiply, divide, abs, min, max)
7. ✅ Compare module (all comparison operations)
8. ✅ Comparison operators for condition-evaluator
9. ✅ Range operators for condition-evaluator
10. ✅ Plugin export configuration
11. ✅ Comprehensive documentation
12. ✅ Migration plan for existing libraries

**Library is production-ready** and can now be adopted by `@f-o-t/money` and `@f-o-t/uom`.
