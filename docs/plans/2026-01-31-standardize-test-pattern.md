# Standardize Test Pattern Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move all test files from `src/` to `__tests__/` folders to standardize test location across all 17 libraries.

**Architecture:** Currently 13/17 libraries use `__tests__/` pattern while 4 libraries (cli, config, datetime, pdf) have tests co-located in `src/`. We'll move all test files to maintain consistent structure, preserving the directory hierarchy within `__tests__/` to match the `src/` structure.

**Tech Stack:** Bun test runner, Git

---

## Summary of Changes

**Libraries to update:**
1. `@f-o-t/cli` - 2 test files
2. `@f-o-t/config` - 4 test files
3. `@f-o-t/datetime` - 8 test files
4. `@f-o-t/pdf` - 7 test files

**Total:** 21 test files to relocate

---

## Task 1: Standardize @f-o-t/cli Tests

**Files:**
- Move: `libraries/cli/src/commands/generate.test.ts` → `libraries/cli/__tests__/commands/generate.test.ts`
- Move: `libraries/cli/src/config-loader.test.ts` → `libraries/cli/__tests__/config-loader.test.ts`

**Step 1: Create __tests__ directory structure**

```bash
cd libraries/cli
mkdir -p __tests__/commands
```

**Step 2: Move test files**

```bash
git mv src/commands/generate.test.ts __tests__/commands/generate.test.ts
git mv src/config-loader.test.ts __tests__/config-loader.test.ts
```

**Step 3: Update import paths in generate.test.ts**

The file references `__dirname` for fixtures. Update the path:

```typescript
// OLD
const fixtureDir = join(__dirname, "..", "__fixtures__", "basic-config");

// NEW
const fixtureDir = join(__dirname, "..", "src", "__fixtures__", "basic-config");
```

**Step 4: Update import paths for tested modules**

```typescript
// OLD (relative imports from within src/)
import { generateConfigFiles } from "./generate";

// NEW (imports from __tests__ to src/)
import { generateConfigFiles } from "../../src/commands/generate";
```

Update config-loader.test.ts similarly:

```typescript
// OLD
import { loadFotConfig, hasFotConfig } from "./config-loader";
const fixtureDir = join(__dirname, "__fixtures__", "basic-config");

// NEW
import { loadFotConfig, hasFotConfig } from "../src/config-loader";
const fixtureDir = join(__dirname, "..", "src", "__fixtures__", "basic-config");
```

**Step 5: Run tests to verify**

```bash
bun test
```

Expected: All tests pass

**Step 6: Commit**

```bash
git add __tests__ src/commands src
git commit -m "refactor(cli): move tests to __tests__ folder"
```

---

## Task 2: Standardize @f-o-t/config Tests

**Files:**
- Move: `libraries/config/src/factory.test.ts` → `libraries/config/__tests__/factory.test.ts`
- Move: `libraries/config/src/schemas.test.ts` → `libraries/config/__tests__/schemas.test.ts`
- Move: `libraries/config/src/types.test.ts` → `libraries/config/__tests__/types.test.ts`
- Move: `libraries/config/src/generators/package-json.test.ts` → `libraries/config/__tests__/generators/package-json.test.ts`

**Step 1: Create __tests__ directory structure**

```bash
cd libraries/config
mkdir -p __tests__/generators
```

**Step 2: Move test files**

```bash
git mv src/factory.test.ts __tests__/factory.test.ts
git mv src/schemas.test.ts __tests__/schemas.test.ts
git mv src/types.test.ts __tests__/types.test.ts
git mv src/generators/package-json.test.ts __tests__/generators/package-json.test.ts
```

**Step 3: Update import paths in all test files**

For `__tests__/factory.test.ts`:

```typescript
// OLD
import { defineFotConfig } from "./factory";

// NEW
import { defineFotConfig } from "../src/factory";
```

For `__tests__/schemas.test.ts`:

```typescript
// OLD
import { fotConfigSchema } from "./schemas";

// NEW
import { fotConfigSchema } from "../src/schemas";
```

For `__tests__/types.test.ts`:

```typescript
// OLD
import type { FotConfig } from "./types";

// NEW
import type { FotConfig } from "../src/types";
```

For `__tests__/generators/package-json.test.ts`:

```typescript
// OLD
import { generatePackageJson } from "./package-json";

// NEW
import { generatePackageJson } from "../../src/generators/package-json";
```

**Step 4: Run tests to verify**

```bash
bun test
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add __tests__ src
git commit -m "refactor(config): move tests to __tests__ folder"
```

---

## Task 3: Standardize @f-o-t/datetime Tests

**Files:**
- Move: `libraries/datetime/src/core/datetime.test.ts` → `libraries/datetime/__tests__/core/datetime.test.ts`
- Move: `libraries/datetime/src/core/factory.test.ts` → `libraries/datetime/__tests__/core/factory.test.ts`
- Move: `libraries/datetime/src/schemas.test.ts` → `libraries/datetime/__tests__/schemas.test.ts`
- Move: `libraries/datetime/src/plugins/plugin-base.test.ts` → `libraries/datetime/__tests__/plugins/plugin-base.test.ts`
- Move: `libraries/datetime/src/plugins/business-days/business-days.test.ts` → `libraries/datetime/__tests__/plugins/business-days/business-days.test.ts`
- Move: `libraries/datetime/src/plugins/format/format.test.ts` → `libraries/datetime/__tests__/plugins/format/format.test.ts`
- Move: `libraries/datetime/src/plugins/relative-time/relative-time.test.ts` → `libraries/datetime/__tests__/plugins/relative-time/relative-time.test.ts`
- Move: `libraries/datetime/src/plugins/timezone/timezone.test.ts` → `libraries/datetime/__tests__/plugins/timezone/timezone.test.ts`

**Step 1: Create __tests__ directory structure**

```bash
cd libraries/datetime
mkdir -p __tests__/core
mkdir -p __tests__/plugins/business-days
mkdir -p __tests__/plugins/format
mkdir -p __tests__/plugins/relative-time
mkdir -p __tests__/plugins/timezone
```

**Step 2: Move test files**

```bash
git mv src/core/datetime.test.ts __tests__/core/datetime.test.ts
git mv src/core/factory.test.ts __tests__/core/factory.test.ts
git mv src/schemas.test.ts __tests__/schemas.test.ts
git mv src/plugins/plugin-base.test.ts __tests__/plugins/plugin-base.test.ts
git mv src/plugins/business-days/business-days.test.ts __tests__/plugins/business-days/business-days.test.ts
git mv src/plugins/format/format.test.ts __tests__/plugins/format/format.test.ts
git mv src/plugins/relative-time/relative-time.test.ts __tests__/plugins/relative-time/relative-time.test.ts
git mv src/plugins/timezone/timezone.test.ts __tests__/plugins/timezone/timezone.test.ts
```

**Step 3: Update import paths in core tests**

For `__tests__/core/datetime.test.ts`:

```typescript
// OLD
import { DateTime } from "./datetime";

// NEW
import { DateTime } from "../../src/core/datetime";
```

For `__tests__/core/factory.test.ts`:

```typescript
// OLD
import { createDateTime } from "./factory";

// NEW
import { createDateTime } from "../../src/core/factory";
```

**Step 4: Update import paths in schemas test**

For `__tests__/schemas.test.ts`:

```typescript
// OLD
import { dateTimeSchema } from "./schemas";

// NEW
import { dateTimeSchema } from "../src/schemas";
```

**Step 5: Update import paths in plugin tests**

For `__tests__/plugins/plugin-base.test.ts`:

```typescript
// OLD
import { PluginBase } from "./plugin-base";

// NEW
import { PluginBase } from "../../src/plugins/plugin-base";
```

For `__tests__/plugins/business-days/business-days.test.ts`:

```typescript
// OLD
import { BusinessDaysPlugin } from "./business-days";

// NEW
import { BusinessDaysPlugin } from "../../../src/plugins/business-days/business-days";
```

For `__tests__/plugins/format/format.test.ts`:

```typescript
// OLD
import { FormatPlugin } from "./format";

// NEW
import { FormatPlugin } from "../../../src/plugins/format/format";
```

For `__tests__/plugins/relative-time/relative-time.test.ts`:

```typescript
// OLD
import { RelativeTimePlugin } from "./relative-time";

// NEW
import { RelativeTimePlugin } from "../../../src/plugins/relative-time/relative-time";
```

For `__tests__/plugins/timezone/timezone.test.ts`:

```typescript
// OLD
import { TimezonePlugin } from "./timezone";

// NEW
import { TimezonePlugin } from "../../../src/plugins/timezone/timezone";
```

**Step 6: Run tests to verify**

```bash
bun test
```

Expected: All tests pass

**Step 7: Commit**

```bash
git add __tests__ src
git commit -m "refactor(datetime): move tests to __tests__ folder"
```

---

## Task 4: Standardize @f-o-t/pdf Tests

**Files:**
- Move: `libraries/pdf/src/core/objects.test.ts` → `libraries/pdf/__tests__/core/objects.test.ts`
- Move: `libraries/pdf/src/plugins/generation/document.test.ts` → `libraries/pdf/__tests__/plugins/generation/document.test.ts`
- Move: `libraries/pdf/src/plugins/generation/fonts.test.ts` → `libraries/pdf/__tests__/plugins/generation/fonts.test.ts`
- Move: `libraries/pdf/src/plugins/generation/page.test.ts` → `libraries/pdf/__tests__/plugins/generation/page.test.ts`
- Move: `libraries/pdf/src/plugins/parsing/lexer.test.ts` → `libraries/pdf/__tests__/plugins/parsing/lexer.test.ts`
- Move: `libraries/pdf/src/plugins/parsing/parser.test.ts` → `libraries/pdf/__tests__/plugins/parsing/parser.test.ts`
- Move: `libraries/pdf/src/plugins/parsing/reader.test.ts` → `libraries/pdf/__tests__/plugins/parsing/reader.test.ts`

**Step 1: Create __tests__ directory structure**

```bash
cd libraries/pdf
mkdir -p __tests__/core
mkdir -p __tests__/plugins/generation
mkdir -p __tests__/plugins/parsing
```

**Step 2: Move test files**

```bash
git mv src/core/objects.test.ts __tests__/core/objects.test.ts
git mv src/plugins/generation/document.test.ts __tests__/plugins/generation/document.test.ts
git mv src/plugins/generation/fonts.test.ts __tests__/plugins/generation/fonts.test.ts
git mv src/plugins/generation/page.test.ts __tests__/plugins/generation/page.test.ts
git mv src/plugins/parsing/lexer.test.ts __tests__/plugins/parsing/lexer.test.ts
git mv src/plugins/parsing/parser.test.ts __tests__/plugins/parsing/parser.test.ts
git mv src/plugins/parsing/reader.test.ts __tests__/plugins/parsing/reader.test.ts
```

**Step 3: Update import paths in core test**

For `__tests__/core/objects.test.ts`:

```typescript
// OLD
import { PDFObject, PDFDictionary, PDFArray } from "./objects";

// NEW
import { PDFObject, PDFDictionary, PDFArray } from "../../src/core/objects";
```

**Step 4: Update import paths in generation tests**

For `__tests__/plugins/generation/document.test.ts`:

```typescript
// OLD
import { PDFDocument } from "./document";

// NEW
import { PDFDocument } from "../../../src/plugins/generation/document";
```

For `__tests__/plugins/generation/fonts.test.ts`:

```typescript
// OLD
import { FontManager } from "./fonts";

// NEW
import { FontManager } from "../../../src/plugins/generation/fonts";
```

For `__tests__/plugins/generation/page.test.ts`:

```typescript
// OLD
import { PDFPage } from "./page";

// NEW
import { PDFPage } from "../../../src/plugins/generation/page";
```

**Step 5: Update import paths in parsing tests**

For `__tests__/plugins/parsing/lexer.test.ts`:

```typescript
// OLD
import { PDFLexer } from "./lexer";

// NEW
import { PDFLexer } from "../../../src/plugins/parsing/lexer";
```

For `__tests__/plugins/parsing/parser.test.ts`:

```typescript
// OLD
import { PDFParser } from "./parser";

// NEW
import { PDFParser } from "../../../src/plugins/parsing/parser";
```

For `__tests__/plugins/parsing/reader.test.ts`:

```typescript
// OLD
import { PDFReader } from "./reader";

// NEW
import { PDFReader } from "../../../src/plugins/parsing/reader";
```

**Step 6: Run tests to verify**

```bash
bun test
```

Expected: All tests pass

**Step 7: Commit**

```bash
git add __tests__ src
git commit -m "refactor(pdf): move tests to __tests__ folder"
```

---

## Task 5: Verification

**Step 1: Run monorepo-wide test verification**

```bash
cd /home/yorizel/Documents/fot-libraries
bun test
```

Expected: All tests pass across all libraries

**Step 2: Verify no test files remain in src/**

```bash
find libraries/cli/src libraries/config/src libraries/datetime/src libraries/pdf/src -name "*.test.ts" -o -name "*.test.tsx"
```

Expected: No output (no test files found)

**Step 3: Verify __tests__ folders exist for all 4 libraries**

```bash
ls -d libraries/cli/__tests__ libraries/config/__tests__ libraries/datetime/__tests__ libraries/pdf/__tests__
```

Expected: All 4 directories listed

**Step 4: Count test files in __tests__ folders**

```bash
find libraries/cli/__tests__ libraries/config/__tests__ libraries/datetime/__tests__ libraries/pdf/__tests__ -name "*.test.ts" | wc -l
```

Expected: 21 (2 + 4 + 8 + 7)

**Step 5: Final commit if needed**

If any final adjustments were made, commit them:

```bash
git add .
git commit -m "chore: verify test pattern standardization"
```

---

## Notes

- All import path updates preserve the exact module structure, just adjusting relative paths
- Using `git mv` preserves file history
- Each library is committed separately for clear history
- The `__tests__` directory structure mirrors the `src/` structure
- Bun test runner automatically discovers tests in `__tests__/` folders
- No changes to test content are needed, only imports and file locations

---

## Success Criteria

- [ ] All 21 test files moved to `__tests__/` folders
- [ ] All import paths updated correctly
- [ ] All tests pass in all 4 libraries
- [ ] No `.test.ts` files remain in `src/` folders
- [ ] Git history preserved with `git mv`
- [ ] Each library committed separately
