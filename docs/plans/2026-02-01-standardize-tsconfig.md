# TSConfig Standardization

**Date:** 2026-02-01
**Status:** Completed

## Overview

Standardized TypeScript configuration across all libraries in the monorepo to ensure consistency and leverage modern TypeScript features.

## Changes Made

### 1. Updated CLI Library TSConfig

Updated `libraries/cli/tsconfig.json` from legacy configuration to match the modern standard:

**Before:**
- Target: ES2022
- Module: ESNext
- Missing many strict type-checking options

**After:**
- Target: ES2023
- Module: Preserve
- Added strict options: `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `noImplicitOverride`
- Added `verbatimModuleSyntax` for better ESM compatibility

### 2. Fixed Type Safety Issue in CLI

Added validation for required command arguments to satisfy `noUncheckedIndexedAccess`:

```typescript
case "create": {
  const name = args[1];
  if (!name) {
    console.error("Error: Library name is required");
    console.log('Usage: fot create <name> [description]');
    process.exit(1);
  }
  // ... rest of command
}
```

### 3. Regenerated All Application Library Configs

Ran `fot generate` in all 15 application libraries:
- brasil-api
- condition-evaluator
- content-analysis
- csv
- datetime
- digital-certificate
- markdown
- money
- ofx
- pdf
- rules-engine
- spelling
- tax-calculator
- uom
- xml

This regenerated:
- `tsconfig.json` - TypeScript configuration
- `package.json` - Package metadata and scripts
- `biome.json` - Linter/formatter configuration

## Verification

All libraries now have consistent TypeScript configuration:
- **Target:** ES2023
- **Module:** Preserve
- **Strict:** true
- **Module Resolution:** bundler

Type checking verified on:
- ✓ CLI library
- ✓ datetime library
- ✓ csv library

## Benefits

1. **Consistency** - All libraries use the same modern TypeScript settings
2. **Type Safety** - Stricter checking catches more errors at compile time
3. **Maintainability** - Single source of truth in `@f-o-t/config` generator
4. **Modern Features** - Leverages latest TypeScript and ESM features

## Notes

- Foundation libraries (`@f-o-t/cli`, `@f-o-t/config`) maintain their tsconfig manually but follow the same standard
- Application libraries should never manually edit `tsconfig.json` - use `fot generate` instead
- The tsconfig generator is in `libraries/config/src/generators/tsconfig.ts`
