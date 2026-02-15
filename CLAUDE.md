# FOT Libraries

Monorepo for `@f-o-t/*` packages. Uses **Bun** as runtime/package manager and **Nx** for task orchestration.

## Commands

```bash
# Whole workspace
bun run build                    # nx run-many -t build (all libraries)
bun run test                     # nx run-many -t test
bun run check                    # nx run-many -t check (biome format + lint)

# Single library
cd libraries/<name>
bun x --bun fot build            # build one library
bun x --bun fot test             # test one library
bun x --bun fot check            # format + lint one library
bun x --bun fot create <name>    # scaffold a new library
bun x --bun fot generate         # regenerate config files (package.json, tsconfig.json, biome.json)
```

## Project Structure

```
libraries/          # All @f-o-t/* packages
  cli/              # @f-o-t/cli — build toolchain CLI
  config/           # @f-o-t/config — shared build config
  <library>/        # Each library: src/, dist/, package.json, fot.config.ts, CHANGELOG.md
scripts/
  release-library.ts   # CI release script (build → GitHub release → npm publish)
  extract-changelog.ts # Changelog parser used by release script
nx.json             # Nx workspace config (task caching, build ordering)
graph.json          # Library dependency graph
```

## Building Libraries

Each library needs:
1. **`fot.config.ts`** — build config via `defineFotConfig()` from `@f-o-t/config`
2. **`package.json`** — scripts use `fot build/test/lint/format`

How it works:
- `fot build` loads `fot.config.ts`, auto-generates `tsconfig.json`, bundles with Bun, generates `.d.ts` declarations
- **`tsconfig.json` is auto-generated** — never edit it by hand
- Runtime deps go in `external` in `fot.config.ts` so they're not bundled
- Nx handles build ordering via `dependsOn: ["^build"]` — dependencies build first

### Example `fot.config.ts`

```ts
import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
  external: ['zod'],
  plugins: ['operators'],  // optional: adds plugin entry points
});
```

## Code Style

- **Functional** — Public APIs export pure functions, not classes
- **Classes only for Errors** — Custom error types extend `Error`
- **Zod for validation** — All input parsing via Zod schemas; types via `z.infer<>`

## Dependencies

- **Zero external deps** — Only `@f-o-t/*` packages + `zod` allowed
- **No third-party runtime deps** — Use native APIs (`node:crypto`, `node:zlib`, `fetch`, etc.)
- **Build your own** — Create a new `@f-o-t/*` library instead of pulling npm packages
- **Zod version**: `^4.3.6` for all libraries
- **Version numbers**: Use `^1.0.0`, NOT `workspace:*`
- **Initial version**: Libraries start at `1.0.0`

### Example package.json dependencies

```json
{
  "dependencies": { "zod": "^4.3.6" },
  "devDependencies": { "@f-o-t/cli": "^0.1.0", "@f-o-t/config": "^0.1.0" }
}
```

## Documentation

- **README.md is required** for every library — covers what it does, installation, API, examples
- **Always update README** when changing API, types, exports, or behavior — same commit

## CHANGELOG Management

All libraries MUST maintain `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

- **Always update CHANGELOG** — every feature, fix, refactor, or breaking change
- **Same commit** as `package.json` version bump
- **Sections**: Added, Changed, Deprecated, Removed, Fixed, Security
- **Semver**: PATCH (bug fixes), MINOR (new features, backward compatible), MAJOR (breaking changes)

When making changes:
1. Add entry to CHANGELOG.md under `[Unreleased]`
2. If releasing: move `[Unreleased]` items to new version section with date, bump `package.json` version
3. **Update downstream `@f-o-t/*` libraries** that depend on the changed library — bump their dep version, add CHANGELOG entry, bump their version

## Publishing Releases

**Libraries are ALWAYS released via GitHub CI. NEVER publish manually.**

1. Update CHANGELOG.md — move `[Unreleased]` entries to new version section with date
2. Bump version in `package.json`
3. Commit: `chore: release @f-o-t/library-name@x.y.z`
4. Push to master — CI auto-detects version changes, builds, tests, creates GitHub release, publishes to npm

## Condition-Evaluator Integration

Libraries that handle domain values can create operator plugins in `src/plugins/operators/` using `createOperator()` from `@f-o-t/condition-evaluator`. Add the plugin to `fot.config.ts` plugins array and make `@f-o-t/condition-evaluator` an optional `peerDependency`.

## Gotchas

- **npm publish + .gitignore**: Root `.gitignore` has `dist` which can exclude `dist/` from npm tarballs even with `"files": ["dist"]` in package.json. Every library has `.npmignore` to prevent this.
- **Build order matters**: Libraries with `@f-o-t/*` dependencies must build after their deps. Nx handles this via `dependsOn: ["^build"]`, and the release script sorts topologically.
- **Toolchain builds first**: The release script builds `config` + `cli` before any library, since all libraries depend on `fot` CLI for their build.
