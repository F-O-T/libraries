# @f-o-t/uom

Type-safe units of measurement library with BigInt precision for JavaScript and TypeScript.

## Features

- **Precision-First**: Uses BigInt internally for exact conversions without floating-point errors
- **Type Safety**: Full TypeScript support with Zod validation
- **Comprehensive Units**: Weight, volume, length, area, temperature with extensible registry
- **Rich Operations**: Convert, add, subtract, multiply, divide, compare measurements
- **Condition-Evaluator Integration**: Optional operators plugin for business rules
- **Immutable API**: All operations return new instances
- **Zero Dependencies**: Only requires @f-o-t/bigint and Zod

## Installation

```bash
bun add @f-o-t/uom
# or
npm install @f-o-t/uom
# or
pnpm add @f-o-t/uom
```

## Quick Start

```typescript
import { of, convert, add, format } from "@f-o-t/uom";

// Create measurements
const weight = of(10.5, "kg");
const height = of(1.75, "m");

// Convert units
const inPounds = convert(weight, "lbs"); // 23.1485 lbs

// Arithmetic operations
const total = add(of(10, "kg"), of(5, "kg")); // 15 kg
const doubled = multiply(weight, 2); // 21 kg

// Comparisons
if (greaterThan(weight, of(5, "kg"))) {
  console.log("Heavy!");
}

// Format for display
console.log(format(weight)); // "10.5 kg"
```

## Core Concepts

### Measurements

A measurement combines a numeric value, unit, scale (decimal precision), and category:

```typescript
interface Measurement {
  value: bigint;      // Internal BigInt for precision
  unit: UnitSymbol;   // e.g., "kg", "m", "L"
  scale: number;      // Decimal places (default: 12)
  category: Category; // "weight", "length", "volume", etc.
}
```

### Factory Functions

Create measurements with `of()` or `zero()`:

```typescript
import { of, zero } from "@f-o-t/uom";

// From number or string
const mass = of(10.5, "kg");
const length = of("2.5", "m");
const volume = of(500, "mL");

// With custom scale (precision)
const precise = of(123.456789012345, "m", 12); // 12 decimal places

// Zero value
const empty = zero("L");
```

## Operations

### Unit Conversion

Convert measurements between compatible units (same category):

```typescript
import { convert, of } from "@f-o-t/uom";

const kg = of(10, "kg");
const lbs = convert(kg, "lbs"); // 22.046226218 lbs

const meters = of(1000, "m");
const km = convert(meters, "km"); // 1 km

const celsius = of(100, "°C");
const fahrenheit = convert(celsius, "°F"); // 212°F
```

**Note:** Throws `ConversionError` if units are from different categories (e.g., weight to length).

### Arithmetic Operations

#### Addition & Subtraction

Combine measurements with the **same unit**:

```typescript
import { add, subtract, of } from "@f-o-t/uom";

const total = add(of(10, "kg"), of(5, "kg")); // 15 kg
const remaining = subtract(of(10, "kg"), of(3, "kg")); // 7 kg

// Different units? Convert first!
const kg = of(10, "kg");
const lbs = of(5, "lbs");
const kgFromLbs = convert(lbs, "kg");
const combined = add(kg, kgFromLbs); // ~12.26796 kg
```

**Note:** Throws `UnitMismatchError` if units don't match.

#### Multiplication & Division

Scale measurements by numeric values:

```typescript
import { multiply, divide, of } from "@f-o-t/uom";

const doubled = multiply(of(10, "kg"), 2); // 20 kg
const tripled = multiply(of(5, "m"), "3.5"); // 17.5 m

const half = divide(of(10, "kg"), 2); // 5 kg
const third = divide(of(9, "L"), 3); // 3 L
```

### Comparison Operations

Compare measurements with the **same unit**:

```typescript
import { equals, greaterThan, lessThan, of } from "@f-o-t/uom";

const a = of(10, "kg");
const b = of(5, "kg");

equals(a, b); // false
greaterThan(a, b); // true
greaterThanOrEqual(a, of(10, "kg")); // true
lessThan(b, a); // true
lessThanOrEqual(b, a); // true
```

**Available comparisons:**
- `equals(a, b)` - Equal
- `greaterThan(a, b)` - Greater than
- `greaterThanOrEqual(a, b)` - Greater than or equal
- `lessThan(a, b)` - Less than
- `lessThanOrEqual(a, b)` - Less than or equal

**Note:** Throws `UnitMismatchError` if units don't match. Convert first if needed.

### Formatting

Convert measurements to human-readable strings:

```typescript
import { format, of } from "@f-o-t/uom";

const weight = of(10.5, "kg");

// Default: includes unit
format(weight); // "10.5 kg"

// Custom options
format(weight, { includeUnit: false }); // "10.5"
format(weight, { unitLabel: "kilograms" }); // "10.5 kilograms"

// Trailing zeros are trimmed
format(of(10, "kg")); // "10 kg" (not "10.000000000000")
```

## Built-in Units

### Weight
- **Metric**: `kg` (kilogram), `g` (gram), `mg` (milligram)
- **Imperial**: `lbs` (pound), `oz` (ounce)

### Length
- **Metric**: `km` (kilometer), `m` (meter), `cm` (centimeter), `mm` (millimeter)
- **Imperial**: `mi` (mile), `yd` (yard), `ft` (foot), `in` (inch)

### Volume
- **Metric**: `L` (liter), `mL` (milliliter)
- **Imperial**: `gal` (gallon), `qt` (quart), `pt` (pint), `cup`, `fl oz` (fluid ounce), `tbsp` (tablespoon), `tsp` (teaspoon)

### Area
- **Metric**: `km²` (square kilometer), `m²` (square meter), `cm²` (square centimeter)
- **Imperial**: `mi²` (square mile), `yd²` (square yard), `ft²` (square foot), `in²` (square inch)

### Temperature
- `°C` (Celsius), `°F` (Fahrenheit), `K` (Kelvin)

## Custom Units

Register your own units at runtime:

```typescript
import { registerUnit, of, convert } from "@f-o-t/uom";

// Register a custom unit
registerUnit({
  symbol: "stone",
  name: "Stone",
  category: "weight",
  toBaseMultiplier: 6350293180000n, // 1 stone = 6.35029318 kg (at scale 12)
});

// Use it immediately
const weight = of(10, "stone");
const kg = convert(weight, "kg"); // 63.5029318 kg
```

### Unit Registry API

```typescript
import { getUnit, getAllUnits, getUnitsByCategory, hasUnit, clearCustomUnits } from "@f-o-t/uom";

// Get unit definition
const kgDef = getUnit("kg");
// { symbol: "kg", name: "Kilogram", category: "weight", ... }

// Get all units in a category
const weightUnits = getUnitsByCategory("weight");
// [{ symbol: "kg", ... }, { symbol: "lbs", ... }, ...]

// Get all registered units
const allUnits = getAllUnits();

// Check if unit exists
if (hasUnit("kg")) {
  // ...
}

// Clear custom units (built-ins remain)
clearCustomUnits();
```

## Condition-Evaluator Integration

Optional operators plugin for business rules and conditional logic:

### Installation

```bash
bun add @f-o-t/condition-evaluator
```

### Usage

```typescript
import { evaluateCondition } from "@f-o-t/condition-evaluator";
import { of } from "@f-o-t/uom";
import {
  measurementEqualsOperator,
  measurementGreaterThanOperator,
  measurementLessThanOperator,
} from "@f-o-t/uom/operators";

// Register operators
const evaluate = evaluateCondition({
  operators: [
    measurementEqualsOperator,
    measurementGreaterThanOperator,
    measurementLessThanOperator,
  ],
});

// Use in conditions
const weight = of(10, "kg");

evaluate({
  actual: weight,
  operator: "measurement_gt",
  expected: of(5, "kg"),
}); // true

evaluate({
  actual: weight,
  operator: "measurement_eq",
  expected: of(10, "kg"),
}); // true
```

### Available Operators

| Operator | Description |
|----------|-------------|
| `measurement_eq` | Equal to |
| `measurement_neq` | Not equal to |
| `measurement_gt` | Greater than |
| `measurement_gte` | Greater than or equal |
| `measurement_lt` | Less than |
| `measurement_lte` | Less than or equal |

All operators validate inputs and enforce same-unit requirements.

## Type Definitions

### Measurement Input

For JSON serialization and parsing:

```typescript
import { type MeasurementInput } from "@f-o-t/uom";

const input: MeasurementInput = {
  value: "10.5",
  unit: "kg",
  scale: 12,
};
```

### Unit Definition

For custom unit registration:

```typescript
import { type UnitDefinition } from "@f-o-t/uom";

const customUnit: UnitDefinition = {
  symbol: "stone",
  name: "Stone",
  category: "weight",
  toBaseMultiplier: 6350293180000n,
};
```

## Error Handling

All operations throw typed errors:

```typescript
import {
  ConversionError,
  UnitMismatchError,
  CategoryMismatchError,
  UnknownUnitError,
  InvalidMeasurementError,
} from "@f-o-t/uom";

try {
  const kg = of(10, "kg");
  const m = of(5, "m");
  add(kg, m); // Throws UnitMismatchError
} catch (error) {
  if (error instanceof UnitMismatchError) {
    console.error("Cannot add different units");
  }
}
```

**Error Types:**
- `ConversionError` - Invalid unit conversion (different categories)
- `UnitMismatchError` - Operations on incompatible units
- `CategoryMismatchError` - Category validation failures
- `UnknownUnitError` - Unknown unit symbol
- `InvalidMeasurementError` - Invalid measurement data

## Advanced: Scale & Precision

The `scale` parameter controls decimal precision (default: 12):

```typescript
import { of, DEFAULT_SCALE } from "@f-o-t/uom";

console.log(DEFAULT_SCALE); // 12

// Default scale (12 decimal places)
const standard = of(10.123456789012, "kg");

// Custom scale
const highPrecision = of(10.123456789012, "kg", 15); // 15 decimals
const lowPrecision = of(10.123456789012, "kg", 6);   // 6 decimals
```

**Important:**
- Operations require same scale (arithmetic, comparison)
- Conversions preserve the source scale
- Higher scale = more precision but larger BigInt values

## Best Practices

### 1. Convert Before Combining

```typescript
// ❌ Bad - will throw UnitMismatchError
add(of(10, "kg"), of(5, "lbs"));

// ✅ Good - convert first
const kg = of(10, "kg");
const lbsAsKg = convert(of(5, "lbs"), "kg");
add(kg, lbsAsKg);
```

### 2. Use Consistent Scales

```typescript
// ❌ Bad - different scales will throw
const a = of(10, "kg", 12);
const b = of(5, "kg", 6);
add(a, b); // Error!

// ✅ Good - same scale
const a = of(10, "kg", 12);
const b = of(5, "kg", 12);
add(a, b); // Works
```

### 3. Format for Display Only

```typescript
// ❌ Bad - format is for humans, not computation
const formatted = format(of(10, "kg"));
const parsed = of(formatted.split(" ")[0], "kg"); // Fragile!

// ✅ Good - keep measurements in structured form
const measurement = of(10, "kg");
// ... do calculations ...
const display = format(measurement); // Format at the end
```

### 4. Register Custom Units Once

```typescript
// ✅ Good - register at app startup
function initializeApp() {
  registerUnit({ symbol: "stone", ... });
  registerUnit({ symbol: "furlong", ... });
}

// ❌ Bad - registering in hot paths
function calculateWeight(value: number) {
  registerUnit({ symbol: "stone", ... }); // Inefficient!
  return of(value, "stone");
}
```

## Comparison with Alternatives

| Feature | @f-o-t/uom | js-quantities | mathjs |
|---------|-----------|---------------|--------|
| BigInt Precision | ✅ | ❌ (float) | ❌ (float) |
| Type Safety | ✅ Full TS | Partial | Partial |
| Tree Shakeable | ✅ | ❌ | ❌ |
| Zero Config | ✅ | ✅ | ❌ |
| Custom Units | ✅ Runtime | ❌ | ✅ |
| Bundle Size | ~15KB | ~50KB | ~500KB |

## API Reference

### Factory Functions
- `of(value, unit, scale?)` - Create measurement
- `zero(unit, scale?)` - Create zero-valued measurement

### Operations
- `convert(measurement, targetUnit)` - Convert units
- `add(a, b)` - Add measurements
- `subtract(a, b)` - Subtract measurements
- `multiply(measurement, scalar)` - Multiply by number
- `divide(measurement, scalar)` - Divide by number
- `equals(a, b)` - Check equality
- `greaterThan(a, b)` - Check if first > second
- `greaterThanOrEqual(a, b)` - Check if first >= second
- `lessThan(a, b)` - Check if first < second
- `lessThanOrEqual(a, b)` - Check if first <= second
- `format(measurement, options?)` - Format as string

### Registry
- `registerUnit(definition)` - Register custom unit
- `getUnit(symbol)` - Get unit definition
- `getAllUnits()` - Get all units
- `getUnitsByCategory(category)` - Get category units
- `hasUnit(symbol)` - Check if unit exists
- `clearCustomUnits()` - Clear custom units

## License

MIT © [F-O-T]

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](../../CONTRIBUTING.md) first.

## Links

- [Changelog](./CHANGELOG.md)
- [GitHub](https://github.com/F-O-T/libraries)
- [Issues](https://github.com/F-O-T/libraries/issues)
