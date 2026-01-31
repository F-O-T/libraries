# FOT Libraries

Monorepo for `@f-o-t/*` packages. Uses Bun as runtime and package manager.

## Building Libraries

All libraries use `@f-o-t/config` and `@f-o-t/cli` for standardized builds.

### Setup

Each library needs:

1. **`fot.config.ts`** — defines build config via `defineFotConfig()` from `@f-o-t/config`
2. **`package.json`** — scripts use `fot build`, `fot test`, `fot lint`, `fot format`; devDependencies are `@f-o-t/cli` and `@f-o-t/config` as `workspace:*`

### How it works

- `fot build` loads `fot.config.ts`, auto-generates `tsconfig.json` from it, then builds with Bun's bundler and generates TypeScript declarations.
- `tsconfig.json` is **not manually maintained** — it's generated on every build from `generateTSConfig()` in `@f-o-t/config`. Don't edit it by hand.
- Runtime dependencies go in `external` in `fot.config.ts` so they're not bundled.

### Example `fot.config.ts`

```ts
import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
  external: ['zod'],       // runtime deps, not bundled
  plugins: ['my-plugin'],  // optional plugin entry points
});
```

### CLI Commands

- `fot build` — build library (generates tsconfig + bundles + declarations)
- `fot test` — run tests via `bun test`
- `fot lint` / `fot format` — linting and formatting
- `fot generate` — regenerate all config files (package.json, tsconfig.json, biome.json)
- `fot check` — run typecheck + tests
- `fot create <name>` — scaffold a new library
