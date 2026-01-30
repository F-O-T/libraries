# @f-o-t/uom

Type-safe units of measurement library with BigInt precision.

## Features

- **Precision-First**: Uses BigInt for exact conversions
- **Type Safety**: Full TypeScript support with Zod validation
- **Comprehensive Units**: Weight, volume, length, area, temperature
- **Extensible**: Register custom units
- **Money Integration**: Calculate costs from measurements
- **Immutable**: All operations return new instances
- **Functional API**: Pure functions for all operations

## Installation

```bash
bun add @f-o-t/uom
```

## Quick Start

```typescript
import { of, convert, add } from "@f-o-t/uom";

const weight = of("10.5", "kg");
const inPounds = convert(weight, "lbs"); // 23.1485 lbs
const total = add(weight, of("2.5", "kg")); // 13 kg
```

## License

MIT
