# @f-o-t/brasil-api

Type-safe wrapper for [Brasil API](https://brasilapi.com.br/) with Zod validation.

## Installation

```bash
bun add @f-o-t/brasil-api
```

## Features

- 🔒 Full TypeScript type safety with Zod validation
- 🌳 Tree-shakeable - import only what you need
- ⚡ Built for Bun and Node.js 18+
- 🎯 Covers all 14 Brasil API endpoint categories
- 🛠️ Flexible configuration (global or context-based)

## Quick Start

```typescript
import { getCep } from "@f-o-t/brasil-api";

const address = await getCep("01310-100");
console.log(address.city); // "São Paulo"
```

## Documentation

Full documentation coming soon.

## License

MIT
