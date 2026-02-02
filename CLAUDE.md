# FOT Libraries

Monorepo for `@f-o-t/*` packages. Uses Bun as runtime and package manager.

## Building Libraries

All libraries use `@f-o-t/config` and `@f-o-t/cli` for standardized builds.

### Setup

Each library needs:

1. **`fot.config.ts`** — defines build config via `defineFotConfig()` from `@f-o-t/config`
2. **`package.json`** — scripts use `fot build`, `fot test`, `fot lint`, `fot format`; devDependencies are `@f-o-t/cli` and `@f-o-t/config` with version numbers (NOT `workspace:*`)

### How it works

- `fot build` loads `fot.config.ts`, auto-generates `tsconfig.json` from it, then builds with Bun's bundler and generates TypeScript declarations.
- `tsconfig.json` is **not manually maintained** — it's generated on every build from `generateTSConfig()` in `@f-o-t/config`. Don't edit it by hand.
- Runtime dependencies go in `external` in `fot.config.ts` so they're not bundled.

### Standard Dependencies

- **Zod version**: Use `^4.3.6` for all libraries
- **Validation**: ALL input validation should be handled via Zod schemas with refinements
- **Dependencies**: Use version numbers like `^0.1.0`, NOT `workspace:*`

### Example `fot.config.ts`

```ts
import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
  external: ['zod'],       // runtime deps, not bundled
  plugins: ['operators'],  // optional plugin entry points (e.g., condition-evaluator operators)
});
```

### Example `package.json` dependencies

```json
{
  "dependencies": {
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@f-o-t/cli": "^0.1.0",
    "@f-o-t/config": "^0.1.0"
  }
}
```

### Condition-Evaluator Integration

When a library handles domain values that can be compared or evaluated in conditions:

1. **Create operators plugin** in `src/plugins/operators/`
2. **Export operators** that integrate with `@f-o-t/condition-evaluator` using `createOperator()`
3. **Add plugin entry** in `fot.config.ts` plugins array
4. **Make it optional** via `peerDependencies` and `peerDependenciesMeta`

Example operator pattern:
```ts
import { createOperator } from "@f-o-t/condition-evaluator";

export const myEqualsOperator = createOperator({
  name: "my_eq",
  type: "custom",
  description: "Check if two values are equal",
  evaluate: (actual: unknown, expected: unknown): boolean => {
    // Validation via Zod
    const a = MyValueSchema.parse(actual);
    const b = MyValueSchema.parse(expected);
    return a === b;
  },
  valueSchema: MyValueSchema,
});
```

### CLI Commands

- `fot build` — build library (generates tsconfig + bundles + declarations)
- `fot test` — run tests via `bun test`
- `fot lint` / `fot format` — linting and formatting
- `fot generate` — regenerate all config files (package.json, tsconfig.json, biome.json)
- `fot check` — run typecheck + tests
- `fot create <name>` — scaffold a new library

## CHANGELOG Management

**CRITICAL REQUIREMENT:** All libraries MUST maintain a CHANGELOG.md file following [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

### Rules

1. **Always update CHANGELOG** — Every feature, fix, refactor, or breaking change MUST be documented
2. **Update before version bump** — CHANGELOG changes should be in the same commit as package.json version changes
3. **Follow format strictly** — Use standard sections: Added, Changed, Deprecated, Removed, Fixed, Security
4. **Use Semantic Versioning** — Version numbers follow [semver](https://semver.org/): MAJOR.MINOR.PATCH

### Format Template

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New features go here

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes

## [1.0.0] - YYYY-MM-DD

### Added
- Initial release features

[Unreleased]: https://github.com/F-O-T/libraries/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/library-name@1.0.0
```

### When Making Changes

**For every code change:**
1. Update CHANGELOG.md with entry in appropriate section (Added/Changed/Fixed/etc.)
2. If releasing, move [Unreleased] items to new version section with date
3. Update package.json version
4. Commit both files together

**Example commit:**
```bash
git add libraries/mylib/CHANGELOG.md libraries/mylib/package.json
git commit -m "chore(mylib): release version 1.2.0

Update CHANGELOG with new features and fixes.
Bump version to 1.2.0."
```

### Version Bumping Guidelines

- **PATCH** (0.0.x) — Bug fixes, internal refactors with no API changes
- **MINOR** (0.x.0) — New features, additions to API (backward compatible)
- **MAJOR** (x.0.0) — Breaking changes to public API
