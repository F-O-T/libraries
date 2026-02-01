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
