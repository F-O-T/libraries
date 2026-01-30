# @f-o-t/cli Tool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a unified CLI tool that reads `fot.config.ts` and provides commands for building, testing, checking, and scaffolding libraries.

**Architecture:** A Bun-based CLI with commands (build, test, check, dev, generate, create) that load the library's `fot.config.ts`, use `@f-o-t/config` generators to create config files, and execute appropriate tools.

**Tech Stack:** Bun (runtime + bundler), @f-o-t/config, TypeScript

---

## Task 1: Initialize @f-o-t/cli Package Structure

**Files:**
- Create: `libraries/cli/package.json`
- Create: `libraries/cli/tsconfig.json`
- Create: `libraries/cli/src/index.ts`
- Create: `libraries/cli/README.md`

**Step 1: Create package.json**

```json
{
  "name": "@f-o-t/cli",
  "version": "0.1.0",
  "description": "Unified CLI tool for F-O-T libraries",
  "type": "module",
  "private": false,
  "bin": {
    "fot": "./dist/index.js"
  },
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "bun": "./src/index.ts",
      "import": {
        "default": "./dist/index.js",
        "types": "./dist/index.d.ts"
      },
      "types": "./src/index.ts"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "bunup",
    "check": "biome check --write .",
    "dev": "bunup --watch",
    "test": "bun test",
    "typecheck": "tsc"
  },
  "dependencies": {
    "@f-o-t/config": "workspace:*"
  },
  "devDependencies": {
    "@biomejs/biome": "2.3.12",
    "@types/bun": "1.3.6",
    "bunup": "0.16.20",
    "typescript": "5.9.3"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/F-O-T/libraries.git"
  },
  "homepage": "https://github.com/F-O-T/libraries/blob/master/libraries/cli",
  "publishConfig": {
    "access": "public"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "declaration": true,
    "isolatedDeclarations": false,
    "module": "Preserve",
    "moduleDetection": "force",
    "moduleResolution": "bundler",
    "noEmit": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": false,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2023",
    "verbatimModuleSyntax": true
  },
  "exclude": ["node_modules", "dist"],
  "include": ["src/**/*"]
}
```

**Step 3: Create bunup.config.ts**

```typescript
import { defineConfig } from "bunup";

export default defineConfig({
  dts: {
    inferTypes: true,
  },
  entry: ["src/index.ts"],
});
```

**Step 4: Create placeholder CLI entry**

Create: `libraries/cli/src/index.ts`

```typescript
#!/usr/bin/env bun

console.log("FOT CLI v0.1.0");
```

**Step 5: Create README**

```markdown
# @f-o-t/cli

Unified CLI tool for F-O-T libraries.

## Installation

\`\`\`bash
bun add -d @f-o-t/cli
\`\`\`

## Usage

\`\`\`bash
fot build      # Build the library
fot dev        # Build in watch mode
fot test       # Run tests
fot check      # Format and lint
fot typecheck  # Type check
fot generate   # Generate config files
fot create     # Scaffold new library
\`\`\`
```

**Step 6: Install dependencies and verify**

Run:
```bash
cd libraries/cli
bun install
bun run build
chmod +x dist/index.js
./dist/index.js
```

Expected: Prints "FOT CLI v0.1.0"

**Step 7: Commit**

```bash
git add libraries/cli
git commit -m "feat(cli): initialize CLI package structure"
```

---

## Task 2: Implement Config Loader

**Files:**
- Create: `libraries/cli/src/config-loader.ts`
- Create: `libraries/cli/src/config-loader.test.ts`

**Step 1: Write test for config loader**

Create: `libraries/cli/src/config-loader.test.ts`

```typescript
import { describe, expect, test } from "bun:test";
import { loadFotConfig } from "./config-loader.ts";
import { join } from "node:path";

describe("loadFotConfig", () => {
  test("should load fot.config.ts from directory", async () => {
    // This test assumes a test fixture exists
    const fixtureDir = join(import.meta.dir, "__fixtures__", "basic-config");
    const config = await loadFotConfig(fixtureDir);

    expect(config).toBeDefined();
    expect(config.name).toBeDefined();
  });

  test("should throw error if config not found", async () => {
    expect(async () => {
      await loadFotConfig("/nonexistent");
    }).toThrow();
  });
});
```

**Step 2: Create test fixture**

Create: `libraries/cli/src/__fixtures__/basic-config/fot.config.ts`

```typescript
import { defineFotConfig } from "@f-o-t/config";

export default defineFotConfig({
  name: "@f-o-t/test",
  description: "Test library",
  entry: ["src/index.ts"],
});
```

**Step 3: Run test to verify it fails**

Run: `cd libraries/cli && bun test config-loader`
Expected: FAIL - config-loader.ts does not exist

**Step 4: Implement config loader**

Create: `libraries/cli/src/config-loader.ts`

```typescript
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { ResolvedFotConfig } from "@f-o-t/config";

/**
 * Load fot.config.ts from the specified directory
 */
export async function loadFotConfig(cwd: string = process.cwd()): Promise<ResolvedFotConfig> {
  const configPath = join(cwd, "fot.config.ts");

  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  try {
    const configModule = await import(configPath);
    const config = configModule.default;

    if (!config) {
      throw new Error("Config file must have a default export");
    }

    return config;
  } catch (error) {
    throw new Error(`Failed to load config: ${error}`);
  }
}

/**
 * Check if fot.config.ts exists in directory
 */
export function hasFotConfig(cwd: string = process.cwd()): boolean {
  return existsSync(join(cwd, "fot.config.ts"));
}
```

**Step 5: Run test to verify it passes**

Run: `cd libraries/cli && bun test config-loader`
Expected: PASS

**Step 6: Commit**

```bash
git add libraries/cli/src/config-loader.ts libraries/cli/src/config-loader.test.ts libraries/cli/src/__fixtures__
git commit -m "feat(cli): implement config loader"
```

---

## Task 3: Implement Generate Command

**Files:**
- Create: `libraries/cli/src/commands/generate.ts`
- Create: `libraries/cli/src/commands/generate.test.ts`

**Step 1: Write test for generate command**

Create: `libraries/cli/src/commands/generate.test.ts`

```typescript
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateConfigFiles } from "./generate.ts";

describe("generateConfigFiles", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "fot-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("should generate package.json", async () => {
    // Create fot.config.ts
    writeFileSync(
      join(tempDir, "fot.config.ts"),
      `
      import { defineFotConfig } from "@f-o-t/config";
      export default defineFotConfig({
        name: "@f-o-t/test",
        description: "Test library",
        entry: ["src/index.ts"],
      });
      `
    );

    await generateConfigFiles(tempDir);

    const pkgPath = join(tempDir, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

    expect(pkg.name).toBe("@f-o-t/test");
    expect(pkg.description).toBe("Test library");
  });

  test("should generate tsconfig.json", async () => {
    writeFileSync(
      join(tempDir, "fot.config.ts"),
      `
      import { defineFotConfig } from "@f-o-t/config";
      export default defineFotConfig({
        name: "@f-o-t/test",
        description: "Test library",
        entry: ["src/index.ts"],
      });
      `
    );

    await generateConfigFiles(tempDir);

    const tsconfigPath = join(tempDir, "tsconfig.json");
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8"));

    expect(tsconfig.compilerOptions).toBeDefined();
    expect(tsconfig.include).toContain("src/**/*");
  });

  test("should generate biome.json", async () => {
    writeFileSync(
      join(tempDir, "fot.config.ts"),
      `
      import { defineFotConfig } from "@f-o-t/config";
      export default defineFotConfig({
        name: "@f-o-t/test",
        description: "Test library",
        entry: ["src/index.ts"],
      });
      `
    );

    await generateConfigFiles(tempDir);

    const biomePath = join(tempDir, "biome.json");
    const biome = JSON.parse(readFileSync(biomePath, "utf-8"));

    expect(biome).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/cli && bun test generate`
Expected: FAIL - generate.ts does not exist

**Step 3: Implement generate command**

Create: `libraries/cli/src/commands/generate.ts`

```typescript
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadFotConfig } from "../config-loader.ts";
import {
  generatePackageJson,
  generateTSConfig,
  generateBiomeConfig,
} from "@f-o-t/config";

/**
 * Generate config files from fot.config.ts
 */
export async function generateConfigFiles(cwd: string = process.cwd()): Promise<void> {
  console.log("📦 Loading fot.config.ts...");
  const config = await loadFotConfig(cwd);

  console.log("✨ Generating config files...");

  // Generate package.json
  const packageJson = generatePackageJson(config);
  writeFileSync(
    join(cwd, "package.json"),
    JSON.stringify(packageJson, null, 2) + "\n"
  );
  console.log("  ✓ package.json");

  // Generate tsconfig.json
  const tsconfig = generateTSConfig(config);
  writeFileSync(
    join(cwd, "tsconfig.json"),
    JSON.stringify(tsconfig, null, 2) + "\n"
  );
  console.log("  ✓ tsconfig.json");

  // Generate biome.json
  const biomeConfig = generateBiomeConfig(config);
  writeFileSync(
    join(cwd, "biome.json"),
    JSON.stringify(biomeConfig, null, 2) + "\n"
  );
  console.log("  ✓ biome.json");

  console.log("\n✅ Config files generated successfully!");
}
```

**Step 4: Run test to verify it passes**

Run: `cd libraries/cli && bun test generate`
Expected: PASS

**Step 5: Commit**

```bash
git add libraries/cli/src/commands/generate.ts libraries/cli/src/commands/generate.test.ts
git commit -m "feat(cli): implement generate command"
```

---

## Task 4: Implement Build Command

**Files:**
- Create: `libraries/cli/src/commands/build.ts`
- Create: `libraries/cli/src/builder.ts`

**Step 1: Create builder utility**

Create: `libraries/cli/src/builder.ts`

```typescript
import { build as bunBuild } from "bun";
import { loadFotConfig } from "./config-loader.ts";
import { join } from "node:path";

interface BuildOptions {
  cwd?: string;
  watch?: boolean;
}

/**
 * Build the library using Bun's bundler
 */
export async function buildLibrary(options: BuildOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const config = await loadFotConfig(cwd);

  console.log(`🔨 Building ${config.name}...`);

  // Collect all entry points (main + plugins)
  const entrypoints = [...config.entry];

  for (const plugin of config.plugins) {
    entrypoints.push(plugin.entry);
  }

  // Determine formats
  const formats = config.format;

  for (const format of formats) {
    console.log(`  Building ${format}...`);

    const result = await bunBuild({
      entrypoints: entrypoints.map((e) => join(cwd, e)),
      outdir: join(cwd, "dist"),
      target: "bun",
      format: format === "esm" ? "esm" : "cjs",
      splitting: format === "esm",
      minify: false,
      sourcemap: "external",
    });

    if (!result.success) {
      throw new Error("Build failed");
    }
  }

  console.log("✅ Build complete!");
}
```

**Step 2: Create build command**

Create: `libraries/cli/src/commands/build.ts`

```typescript
import { buildLibrary } from "../builder.ts";

/**
 * Build command handler
 */
export async function buildCommand(options: { watch?: boolean } = {}): Promise<void> {
  try {
    await buildLibrary({ watch: options.watch });
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}
```

**Step 3: Commit**

```bash
git add libraries/cli/src/builder.ts libraries/cli/src/commands/build.ts
git commit -m "feat(cli): implement build command"
```

---

## Task 5: Implement Other Commands

**Files:**
- Create: `libraries/cli/src/commands/test.ts`
- Create: `libraries/cli/src/commands/check.ts`
- Create: `libraries/cli/src/commands/typecheck.ts`
- Create: `libraries/cli/src/commands/dev.ts`
- Create: `libraries/cli/src/commands/index.ts`

**Step 1: Implement test command**

Create: `libraries/cli/src/commands/test.ts`

```typescript
import { spawn } from "bun";

/**
 * Test command handler
 */
export async function testCommand(options: { coverage?: boolean; watch?: boolean } = {}): Promise<void> {
  const args = ["test"];

  if (options.coverage) {
    args.push("--coverage");
  }

  if (options.watch) {
    args.push("--watch");
  }

  console.log("🧪 Running tests...");

  const proc = spawn(["bun", ...args], {
    stdio: ["inherit", "inherit", "inherit"],
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
```

**Step 2: Implement check command**

Create: `libraries/cli/src/commands/check.ts`

```typescript
import { spawn } from "bun";

/**
 * Check command handler (format + lint)
 */
export async function checkCommand(): Promise<void> {
  console.log("🔍 Running biome check...");

  const proc = spawn(["bunx", "biome", "check", "--write", "."], {
    stdio: ["inherit", "inherit", "inherit"],
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    process.exit(exitCode);
  }

  console.log("✅ Check complete!");
}
```

**Step 3: Implement typecheck command**

Create: `libraries/cli/src/commands/typecheck.ts`

```typescript
import { spawn } from "bun";

/**
 * Typecheck command handler
 */
export async function typecheckCommand(): Promise<void> {
  console.log("📝 Type checking...");

  const proc = spawn(["bunx", "tsc"], {
    stdio: ["inherit", "inherit", "inherit"],
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    process.exit(exitCode);
  }

  console.log("✅ Type check complete!");
}
```

**Step 4: Implement dev command**

Create: `libraries/cli/src/commands/dev.ts`

```typescript
import { buildLibrary } from "../builder.ts";

/**
 * Dev command handler (build in watch mode)
 */
export async function devCommand(): Promise<void> {
  console.log("👀 Starting dev mode...");

  try {
    await buildLibrary({ watch: true });
  } catch (error) {
    console.error("❌ Dev mode failed:", error);
    process.exit(1);
  }
}
```

**Step 5: Create commands index**

Create: `libraries/cli/src/commands/index.ts`

```typescript
export * from "./build.ts";
export * from "./dev.ts";
export * from "./test.ts";
export * from "./check.ts";
export * from "./typecheck.ts";
export * from "./generate.ts";
```

**Step 6: Commit**

```bash
git add libraries/cli/src/commands
git commit -m "feat(cli): implement test, check, typecheck, and dev commands"
```

---

## Task 6: Implement Create/Scaffold Command

**Files:**
- Create: `libraries/cli/src/commands/create.ts`
- Create: `libraries/cli/src/templates/library.ts`

**Step 1: Create library template**

Create: `libraries/cli/src/templates/library.ts`

```typescript
export function getLibraryTemplate(name: string, description: string) {
  const packageName = `@f-o-t/${name}`;

  return {
    fotConfig: `import { defineFotConfig } from "@f-o-t/config";

export default defineFotConfig({
  name: "${packageName}",
  description: "${description}",
  entry: ["src/index.ts"],
});
`,
    indexTs: `/**
 * ${description}
 */

export const placeholder = "${name}";
`,
    indexTestTs: `import { describe, expect, test } from "bun:test";
import { placeholder } from "./index.ts";

describe("${name}", () => {
  test("should export placeholder", () => {
    expect(placeholder).toBe("${name}");
  });
});
`,
    readme: `# ${packageName}

${description}

## Installation

\\\`\\\`\\\`bash
bun add ${packageName}
\\\`\\\`\\\`

## Usage

\\\`\\\`\\\`typescript
import { placeholder } from "${packageName}";

console.log(placeholder);
\\\`\\\`\\\`
`,
  };
}
```

**Step 2: Implement create command**

Create: `libraries/cli/src/commands/create.ts`

```typescript
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getLibraryTemplate } from "../templates/library.ts";
import { generateConfigFiles } from "./generate.ts";
import { spawn } from "bun";

interface CreateOptions {
  name: string;
  description: string;
  cwd?: string;
}

/**
 * Create a new library
 */
export async function createCommand(options: CreateOptions): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const libraryPath = join(cwd, "libraries", options.name);

  // Check if library already exists
  if (existsSync(libraryPath)) {
    console.error(`❌ Library already exists: ${libraryPath}`);
    process.exit(1);
  }

  console.log(`📦 Creating library: @f-o-t/${options.name}`);

  // Create directory structure
  mkdirSync(libraryPath, { recursive: true });
  mkdirSync(join(libraryPath, "src"), { recursive: true });

  // Get templates
  const templates = getLibraryTemplate(options.name, options.description);

  // Write files
  writeFileSync(join(libraryPath, "fot.config.ts"), templates.fotConfig);
  console.log("  ✓ fot.config.ts");

  writeFileSync(join(libraryPath, "src", "index.ts"), templates.indexTs);
  console.log("  ✓ src/index.ts");

  writeFileSync(join(libraryPath, "src", "index.test.ts"), templates.indexTestTs);
  console.log("  ✓ src/index.test.ts");

  writeFileSync(join(libraryPath, "README.md"), templates.readme);
  console.log("  ✓ README.md");

  // Generate config files
  console.log("\n📝 Generating config files...");
  await generateConfigFiles(libraryPath);

  // Install dependencies
  console.log("\n📦 Installing dependencies...");
  const proc = spawn(["bun", "install"], {
    cwd: libraryPath,
    stdio: ["inherit", "inherit", "inherit"],
  });

  await proc.exited;

  console.log(`\n✅ Library created successfully at ${libraryPath}`);
  console.log(`\nNext steps:`);
  console.log(`  cd libraries/${options.name}`);
  console.log(`  fot dev`);
}
```

**Step 3: Export create command**

Modify: `libraries/cli/src/commands/index.ts`

```typescript
export * from "./build.ts";
export * from "./dev.ts";
export * from "./test.ts";
export * from "./check.ts";
export * from "./typecheck.ts";
export * from "./generate.ts";
export * from "./create.ts";
```

**Step 4: Commit**

```bash
git add libraries/cli/src/commands/create.ts libraries/cli/src/templates
git add libraries/cli/src/commands/index.ts
git commit -m "feat(cli): implement create/scaffold command"
```

---

## Task 7: Implement CLI Entry Point and Argument Parsing

**Files:**
- Modify: `libraries/cli/src/index.ts`

**Step 1: Implement CLI with commands**

Modify: `libraries/cli/src/index.ts`

```typescript
#!/usr/bin/env bun

import {
  buildCommand,
  devCommand,
  testCommand,
  checkCommand,
  typecheckCommand,
  generateConfigFiles,
  createCommand,
} from "./commands/index.ts";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case "build":
      await buildCommand();
      break;

    case "dev":
      await devCommand();
      break;

    case "test": {
      const coverage = args.includes("--coverage");
      const watch = args.includes("--watch");
      await testCommand({ coverage, watch });
      break;
    }

    case "check":
      await checkCommand();
      break;

    case "typecheck":
      await typecheckCommand();
      break;

    case "generate":
      await generateConfigFiles();
      break;

    case "create": {
      const name = args[1];
      const description = args[2] || "A new F-O-T library";

      if (!name) {
        console.error("❌ Usage: fot create <name> [description]");
        process.exit(1);
      }

      await createCommand({ name, description });
      break;
    }

    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;

    case "version":
    case "--version":
    case "-v":
      console.log("fot v0.1.0");
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
FOT CLI - Unified tooling for F-O-T libraries

Usage:
  fot <command> [options]

Commands:
  build              Build the library
  dev                Build in watch mode
  test               Run tests
  test --coverage    Run tests with coverage
  test --watch       Run tests in watch mode
  check              Format and lint code
  typecheck          Type check the code
  generate           Generate config files from fot.config.ts
  create <name>      Create a new library

Options:
  -h, --help         Show this help message
  -v, --version      Show version number

Examples:
  fot build
  fot dev
  fot create my-library "My awesome library"
  fot generate
  `);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
```

**Step 2: Build and test CLI**

Run:
```bash
cd libraries/cli
bun run build
chmod +x dist/index.js
./dist/index.js --help
```

Expected: Prints help message

**Step 3: Test CLI commands locally**

Run:
```bash
./dist/index.js version
```

Expected: Prints version

**Step 4: Commit**

```bash
git add libraries/cli/src/index.ts
git commit -m "feat(cli): implement CLI entry point with argument parsing"
```

---

## Task 8: Add CLI to Workspace and Test Integration

**Files:**
- Modify: `libraries/cli/package.json` (add workspace dependency)
- Create: `libraries/cli/.bin/fot` (symlink for local testing)

**Step 1: Update package.json to use workspace protocol**

Verify `libraries/cli/package.json` has:

```json
{
  "dependencies": {
    "@f-o-t/config": "workspace:*"
  }
}
```

**Step 2: Install CLI globally in workspace**

Run:
```bash
cd /home/yorizel/Documents/fot-libraries
bun install
bun link --global libraries/cli
```

**Step 3: Test CLI in an existing library**

Run:
```bash
cd libraries/datetime
fot generate
```

Expected: Generates package.json, tsconfig.json, biome.json from fot.config.ts

**Step 4: Verify generated files**

Check that:
- package.json has correct exports and scripts
- tsconfig.json has correct compiler options
- biome.json has formatting config

**Step 5: Test build command**

Run:
```bash
cd libraries/datetime
fot build
```

Expected: Builds successfully to dist/

**Step 6: Commit**

```bash
git add .
git commit -m "feat(cli): integrate CLI with workspace"
```

---

## Task 9: Update README and Documentation

**Files:**
- Modify: `libraries/cli/README.md`
- Create: `libraries/cli/CHANGELOG.md`

**Step 1: Update README with complete documentation**

Modify: `libraries/cli/README.md`

```markdown
# @f-o-t/cli

Unified CLI tool for building, testing, and managing F-O-T libraries.

## Features

- 🔨 **Build** - Bundle libraries using Bun
- 🧪 **Test** - Run tests with Bun's test runner
- 🔍 **Check** - Format and lint with Biome
- 📝 **Typecheck** - Type checking with TypeScript
- ⚡ **Dev** - Watch mode for development
- 📦 **Generate** - Generate config files from \`fot.config.ts\`
- 🚀 **Create** - Scaffold new libraries

## Installation

\`\`\`bash
bun add -d @f-o-t/cli @f-o-t/config
\`\`\`

## Quick Start

1. Create a \`fot.config.ts\` in your library:

\`\`\`typescript
import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
  name: '@f-o-t/my-library',
  description: 'My awesome library',
  entry: ['src/index.ts'],
});
\`\`\`

2. Generate config files:

\`\`\`bash
fot generate
\`\`\`

3. Build your library:

\`\`\`bash
fot build
\`\`\`

## Commands

### \`fot build\`

Build the library using Bun's bundler.

\`\`\`bash
fot build
\`\`\`

### \`fot dev\`

Build in watch mode for development.

\`\`\`bash
fot dev
\`\`\`

### \`fot test\`

Run tests using Bun's test runner.

\`\`\`bash
fot test                 # Run tests
fot test --coverage      # Run with coverage
fot test --watch         # Run in watch mode
\`\`\`

### \`fot check\`

Format and lint code using Biome.

\`\`\`bash
fot check
\`\`\`

### \`fot typecheck\`

Type check the code using TypeScript.

\`\`\`bash
fot typecheck
\`\`\`

### \`fot generate\`

Generate config files (package.json, tsconfig.json, biome.json) from \`fot.config.ts\`.

\`\`\`bash
fot generate
\`\`\`

**Important:** Run this after updating \`fot.config.ts\` to sync config files.

### \`fot create\`

Scaffold a new library in the monorepo.

\`\`\`bash
fot create <name> [description]
\`\`\`

Example:

\`\`\`bash
fot create my-library "My awesome library"
\`\`\`

This creates:
- \`libraries/my-library/\` directory
- \`fot.config.ts\`
- \`src/index.ts\` with tests
- Generated config files
- README

## Configuration

All configuration lives in \`fot.config.ts\`. See [@f-o-t/config](../config) for details.

## CI/CD Integration

Add to your CI pipeline:

\`\`\`yaml
- run: fot generate     # Ensure configs are in sync
- run: fot typecheck    # Type check
- run: fot check        # Lint and format
- run: fot test         # Run tests
- run: fot build        # Build
\`\`\`

## Development

\`\`\`bash
# Clone the repo
git clone https://github.com/F-O-T/libraries.git

# Install dependencies
bun install

# Build CLI
cd libraries/cli
bun run build

# Link globally
bun link --global

# Use it
fot --help
\`\`\`

## License

MIT
```

**Step 2: Create CHANGELOG**

Create: `libraries/cli/CHANGELOG.md`

```markdown
# Changelog

## [0.1.0] - 2026-01-30

### Added

- Initial release
- \`build\` command for building libraries
- \`dev\` command for watch mode
- \`test\` command with coverage and watch options
- \`check\` command for linting and formatting
- \`typecheck\` command for type checking
- \`generate\` command to create config files from fot.config.ts
- \`create\` command to scaffold new libraries
- Config file generators (package.json, tsconfig.json, biome.json)
```

**Step 3: Commit**

```bash
git add libraries/cli/README.md libraries/cli/CHANGELOG.md
git commit -m "docs(cli): add comprehensive documentation"
```

---

## Summary

The \`@f-o-t/cli\` tool is now complete with:

1. ✅ Config loader for reading \`fot.config.ts\`
2. ✅ \`build\` command using Bun's bundler
3. ✅ \`dev\` command for watch mode
4. ✅ \`test\` command with coverage and watch options
5. ✅ \`check\` command for linting/formatting
6. ✅ \`typecheck\` command
7. ✅ \`generate\` command to create config files
8. ✅ \`create\` command to scaffold new libraries
9. ✅ Comprehensive documentation

**Both packages are ready to use!** Libraries can now use a single \`fot.config.ts\` file and the \`fot\` CLI for all tooling needs.
