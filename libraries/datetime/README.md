# @f-o-t/datetime

Lightweight datetime library with modern fluent API and Zod validation.

## Features

- Modern fluent API (`.addDays()`, `.addMonths()`)
- Zod-first validation
- Immutable operations
- Plugin-based architecture
- TypeScript-first
- Works with Bun and Node.js

## Installation

```bash
bun add @f-o-t/datetime
```

## Quick Start

```typescript
import { datetime } from "@f-o-t/datetime";

const now = datetime();
const tomorrow = now.addDays(1);
const formatted = tomorrow.toISO();
```

## Documentation

Coming soon.

## License

MIT
