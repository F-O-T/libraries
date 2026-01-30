# @f-o-t/config Library Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the configuration library that provides type-safe factories and schemas for defining library configurations.

**Architecture:** A TypeScript library exporting a `defineFotConfig()` factory function with Zod schemas for validation. Provides type definitions for all configuration options including build settings, package metadata, TypeScript options, and Biome options.

**Tech Stack:** TypeScript, Zod for schemas, Bun for runtime

---

## Task 1: Initialize @f-o-t/config Library Structure

**Files:**
- Create: `libraries/config/package.json`
- Create: `libraries/config/tsconfig.json`
- Create: `libraries/config/src/index.ts`
- Create: `libraries/config/README.md`

**Step 1: Create package.json**

Create the package manifest with dependencies.

```json
{
  "name": "@f-o-t/config",
  "version": "0.1.0",
  "description": "Standardized configuration for F-O-T libraries",
  "type": "module",
  "private": false,
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
    "zod": "4.3.6"
  },
  "devDependencies": {
    "@biomejs/biome": "2.3.12",
    "@types/bun": "1.3.6",
    "bunup": "0.16.20",
    "typescript": "5.9.3"
  },
  "peerDependencies": {
    "typescript": ">=4.5.0"
  },
  "peerDependenciesMeta": {
    "typescript": {
      "optional": true
    }
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/F-O-T/libraries.git"
  },
  "homepage": "https://github.com/F-O-T/libraries/blob/master/libraries/config",
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

**Step 4: Create placeholder index.ts**

```typescript
export const placeholder = "config library";
```

**Step 5: Create README.md**

```markdown
# @f-o-t/config

Standardized configuration for F-O-T libraries.

## Installation

\`\`\`bash
bun add -d @f-o-t/config
\`\`\`

## Usage

\`\`\`typescript
import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
  name: '@f-o-t/my-library',
  description: 'My library description',
  entry: ['src/index.ts'],
});
\`\`\`
```

**Step 6: Install dependencies and verify build**

Run:
```bash
cd libraries/config
bun install
bun run build
```

Expected: Build succeeds, dist/ folder created

**Step 7: Commit**

```bash
git add libraries/config
git commit -m "feat(config): initialize library structure"
```

---

## Task 2: Define Core Configuration Types

**Files:**
- Create: `libraries/config/src/types.ts`
- Modify: `libraries/config/src/index.ts`

**Step 1: Write test for basic types**

Create: `libraries/config/src/types.test.ts`

```typescript
import { describe, expect, test } from "bun:test";
import type { FotConfig, BuildFormat } from "./types.ts";

describe("FotConfig types", () => {
  test("should accept valid config", () => {
    const config: FotConfig = {
      name: "@f-o-t/test",
      description: "Test library",
      entry: ["src/index.ts"],
    };

    expect(config.name).toBe("@f-o-t/test");
  });

  test("should accept config with plugins", () => {
    const config: FotConfig = {
      name: "@f-o-t/test",
      description: "Test library",
      entry: ["src/index.ts"],
      plugins: ["plugin-a", "plugin-b"],
    };

    expect(config.plugins).toHaveLength(2);
  });

  test("should accept format options", () => {
    const formats: BuildFormat[] = ["esm", "cjs"];
    expect(formats).toContain("esm");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/config && bun test`
Expected: FAIL - types.ts does not exist

**Step 3: Create types.ts with core types**

```typescript
/**
 * Build output formats
 */
export type BuildFormat = "esm" | "cjs";

/**
 * TypeScript compiler options override
 */
export interface TypeScriptOptions {
  target?: string;
  strict?: boolean;
  skipLibCheck?: boolean;
  noUncheckedIndexedAccess?: boolean;
  [key: string]: unknown;
}

/**
 * Biome configuration override
 */
export interface BiomeOptions {
  linter?: {
    enabled?: boolean;
    rules?: Record<string, unknown>;
  };
  formatter?: {
    enabled?: boolean;
    indentStyle?: "tab" | "space";
  };
  [key: string]: unknown;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  name: string;
  entry?: string; // defaults to src/plugins/{name}/index.ts
}

/**
 * Main FOT configuration
 */
export interface FotConfig {
  // Package metadata
  name: string;
  description: string;
  version?: string;
  license?: string;

  // Build configuration
  entry: string[];
  plugins?: string[] | PluginConfig[];
  format?: BuildFormat[];

  // Tooling overrides
  typescript?: TypeScriptOptions;
  biome?: BiomeOptions;

  // Package.json additions
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

/**
 * Resolved configuration with defaults applied
 */
export interface ResolvedFotConfig extends Required<Omit<FotConfig, 'plugins' | 'version' | 'license' | 'dependencies' | 'devDependencies' | 'peerDependencies' | 'scripts'>> {
  plugins: PluginConfig[];
  version: string;
  license: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  scripts: Record<string, string>;
}
```

**Step 4: Export types from index.ts**

Modify: `libraries/config/src/index.ts`

```typescript
export * from "./types.ts";
```

**Step 5: Run test to verify it passes**

Run: `cd libraries/config && bun test`
Expected: PASS

**Step 6: Commit**

```bash
git add libraries/config/src/types.ts libraries/config/src/types.test.ts libraries/config/src/index.ts
git commit -m "feat(config): add core configuration types"
```

---

## Task 3: Create Zod Schemas for Validation

**Files:**
- Create: `libraries/config/src/schemas.ts`
- Create: `libraries/config/src/schemas.test.ts`
- Modify: `libraries/config/src/index.ts`

**Step 1: Write test for schema validation**

Create: `libraries/config/src/schemas.test.ts`

```typescript
import { describe, expect, test } from "bun:test";
import { fotConfigSchema } from "./schemas.ts";

describe("fotConfigSchema", () => {
  test("should validate minimal config", () => {
    const result = fotConfigSchema.safeParse({
      name: "@f-o-t/test",
      description: "Test library",
      entry: ["src/index.ts"],
    });

    expect(result.success).toBe(true);
  });

  test("should reject invalid package name", () => {
    const result = fotConfigSchema.safeParse({
      name: "invalid name with spaces",
      description: "Test library",
      entry: ["src/index.ts"],
    });

    expect(result.success).toBe(false);
  });

  test("should accept plugins as string array", () => {
    const result = fotConfigSchema.safeParse({
      name: "@f-o-t/test",
      description: "Test library",
      entry: ["src/index.ts"],
      plugins: ["plugin-a", "plugin-b"],
    });

    expect(result.success).toBe(true);
  });

  test("should accept plugins as config objects", () => {
    const result = fotConfigSchema.safeParse({
      name: "@f-o-t/test",
      description: "Test library",
      entry: ["src/index.ts"],
      plugins: [
        { name: "plugin-a" },
        { name: "plugin-b", entry: "custom/path.ts" },
      ],
    });

    expect(result.success).toBe(true);
  });

  test("should validate format array", () => {
    const result = fotConfigSchema.safeParse({
      name: "@f-o-t/test",
      description: "Test library",
      entry: ["src/index.ts"],
      format: ["esm", "cjs"],
    });

    expect(result.success).toBe(true);
  });

  test("should reject invalid format", () => {
    const result = fotConfigSchema.safeParse({
      name: "@f-o-t/test",
      description: "Test library",
      entry: ["src/index.ts"],
      format: ["invalid"],
    });

    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/config && bun test schemas`
Expected: FAIL - schemas.ts does not exist

**Step 3: Create schemas.ts**

```typescript
import { z } from "zod";

const buildFormatSchema = z.enum(["esm", "cjs"]);

const pluginConfigSchema = z.union([
  z.string(),
  z.object({
    name: z.string(),
    entry: z.string().optional(),
  }),
]);

const typeScriptOptionsSchema = z.record(z.unknown()).optional();
const biomeOptionsSchema = z.record(z.unknown()).optional();

export const fotConfigSchema = z.object({
  // Package metadata
  name: z.string().regex(/^@?[a-z0-9-~][a-z0-9-._~]*\/[a-z0-9-~][a-z0-9-._~]*$|^[a-z0-9-~][a-z0-9-._~]*$/, "Invalid package name"),
  description: z.string().min(1),
  version: z.string().optional(),
  license: z.string().optional(),

  // Build configuration
  entry: z.array(z.string()).min(1),
  plugins: z.array(pluginConfigSchema).optional(),
  format: z.array(buildFormatSchema).optional(),

  // Tooling overrides
  typescript: typeScriptOptionsSchema,
  biome: biomeOptionsSchema,

  // Package.json additions
  dependencies: z.record(z.string()).optional(),
  devDependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional(),
  scripts: z.record(z.string()).optional(),
});

export type FotConfigInput = z.input<typeof fotConfigSchema>;
export type FotConfigOutput = z.output<typeof fotConfigSchema>;
```

**Step 4: Export schemas from index.ts**

Modify: `libraries/config/src/index.ts`

```typescript
export * from "./types.ts";
export * from "./schemas.ts";
```

**Step 5: Run test to verify it passes**

Run: `cd libraries/config && bun test schemas`
Expected: PASS

**Step 6: Commit**

```bash
git add libraries/config/src/schemas.ts libraries/config/src/schemas.test.ts libraries/config/src/index.ts
git commit -m "feat(config): add Zod schemas for validation"
```

---

## Task 4: Implement defineFotConfig Factory

**Files:**
- Create: `libraries/config/src/factory.ts`
- Create: `libraries/config/src/factory.test.ts`
- Modify: `libraries/config/src/index.ts`

**Step 1: Write test for factory function**

Create: `libraries/config/src/factory.test.ts`

```typescript
import { describe, expect, test } from "bun:test";
import { defineFotConfig } from "./factory.ts";

describe("defineFotConfig", () => {
  test("should create config with defaults", () => {
    const config = defineFotConfig({
      name: "@f-o-t/test",
      description: "Test library",
      entry: ["src/index.ts"],
    });

    expect(config.name).toBe("@f-o-t/test");
    expect(config.format).toEqual(["esm"]);
    expect(config.license).toBe("MIT");
    expect(config.version).toBe("0.1.0");
  });

  test("should normalize string plugins to config objects", () => {
    const config = defineFotConfig({
      name: "@f-o-t/test",
      description: "Test library",
      entry: ["src/index.ts"],
      plugins: ["timezone", "format"],
    });

    expect(config.plugins).toEqual([
      { name: "timezone", entry: "src/plugins/timezone/index.ts" },
      { name: "format", entry: "src/plugins/format/index.ts" },
    ]);
  });

  test("should preserve custom plugin entry paths", () => {
    const config = defineFotConfig({
      name: "@f-o-t/test",
      description: "Test library",
      entry: ["src/index.ts"],
      plugins: [
        { name: "custom", entry: "custom/path.ts" },
      ],
    });

    expect(config.plugins[0]?.entry).toBe("custom/path.ts");
  });

  test("should merge typescript options with defaults", () => {
    const config = defineFotConfig({
      name: "@f-o-t/test",
      description: "Test library",
      entry: ["src/index.ts"],
      typescript: {
        target: "ES2020",
      },
    });

    expect(config.typescript.target).toBe("ES2020");
    expect(config.typescript.strict).toBe(true);
  });

  test("should throw on invalid config", () => {
    expect(() => {
      defineFotConfig({
        name: "invalid name",
        description: "Test",
        entry: ["src/index.ts"],
      });
    }).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/config && bun test factory`
Expected: FAIL - factory.ts does not exist

**Step 3: Create factory.ts with defaults**

```typescript
import type { FotConfig, ResolvedFotConfig, PluginConfig } from "./types.ts";
import { fotConfigSchema } from "./schemas.ts";

const DEFAULT_TYPESCRIPT_OPTIONS = {
  allowImportingTsExtensions: true,
  declaration: true,
  isolatedDeclarations: false,
  module: "Preserve",
  moduleDetection: "force",
  moduleResolution: "bundler",
  noEmit: true,
  noFallthroughCasesInSwitch: true,
  noImplicitOverride: true,
  noPropertyAccessFromIndexSignature: false,
  noUncheckedIndexedAccess: true,
  noUnusedLocals: false,
  noUnusedParameters: false,
  skipLibCheck: true,
  strict: true,
  target: "ES2023",
  verbatimModuleSyntax: true,
};

const DEFAULT_BIOME_OPTIONS = {
  linter: {
    enabled: true,
  },
  formatter: {
    enabled: true,
    indentStyle: "tab" as const,
  },
};

/**
 * Normalize plugin configuration
 */
function normalizePlugins(plugins?: (string | PluginConfig)[]): PluginConfig[] {
  if (!plugins) return [];

  return plugins.map((plugin) => {
    if (typeof plugin === "string") {
      return {
        name: plugin,
        entry: `src/plugins/${plugin}/index.ts`,
      };
    }
    return {
      name: plugin.name,
      entry: plugin.entry ?? `src/plugins/${plugin.name}/index.ts`,
    };
  });
}

/**
 * Define a FOT library configuration
 */
export function defineFotConfig(config: FotConfig): ResolvedFotConfig {
  // Validate input
  const validationResult = fotConfigSchema.safeParse(config);
  if (!validationResult.success) {
    throw new Error(`Invalid FOT config: ${validationResult.error.message}`);
  }

  // Apply defaults
  return {
    name: config.name,
    description: config.description,
    version: config.version ?? "0.1.0",
    license: config.license ?? "MIT",
    entry: config.entry,
    plugins: normalizePlugins(config.plugins),
    format: config.format ?? ["esm"],
    typescript: {
      ...DEFAULT_TYPESCRIPT_OPTIONS,
      ...config.typescript,
    },
    biome: {
      ...DEFAULT_BIOME_OPTIONS,
      ...config.biome,
    },
    dependencies: config.dependencies ?? {},
    devDependencies: config.devDependencies ?? {},
    peerDependencies: config.peerDependencies ?? {},
    scripts: config.scripts ?? {},
  };
}
```

**Step 4: Export factory from index.ts**

Modify: `libraries/config/src/index.ts`

```typescript
export * from "./types.ts";
export * from "./schemas.ts";
export * from "./factory.ts";
```

**Step 5: Run test to verify it passes**

Run: `cd libraries/config && bun test factory`
Expected: PASS

**Step 6: Commit**

```bash
git add libraries/config/src/factory.ts libraries/config/src/factory.test.ts libraries/config/src/index.ts
git commit -m "feat(config): implement defineFotConfig factory"
```

---

## Task 5: Add Config File Generators

**Files:**
- Create: `libraries/config/src/generators/index.ts`
- Create: `libraries/config/src/generators/package-json.ts`
- Create: `libraries/config/src/generators/tsconfig.ts`
- Create: `libraries/config/src/generators/biome.ts`
- Create: `libraries/config/src/generators/package-json.test.ts`
- Modify: `libraries/config/src/index.ts`

**Step 1: Write test for package.json generator**

Create: `libraries/config/src/generators/package-json.test.ts`

```typescript
import { describe, expect, test } from "bun:test";
import { generatePackageJson } from "./package-json.ts";
import { defineFotConfig } from "../factory.ts";

describe("generatePackageJson", () => {
  test("should generate basic package.json", () => {
    const config = defineFotConfig({
      name: "@f-o-t/test",
      description: "Test library",
      entry: ["src/index.ts"],
    });

    const pkg = generatePackageJson(config);

    expect(pkg.name).toBe("@f-o-t/test");
    expect(pkg.description).toBe("Test library");
    expect(pkg.version).toBe("0.1.0");
    expect(pkg.license).toBe("MIT");
    expect(pkg.type).toBe("module");
  });

  test("should generate exports for main entry", () => {
    const config = defineFotConfig({
      name: "@f-o-t/test",
      description: "Test library",
      entry: ["src/index.ts"],
    });

    const pkg = generatePackageJson(config);

    expect(pkg.exports).toHaveProperty(".");
    expect(pkg.exports?.["."]?.bun).toBe("./src/index.ts");
  });

  test("should generate exports for plugins", () => {
    const config = defineFotConfig({
      name: "@f-o-t/test",
      description: "Test library",
      entry: ["src/index.ts"],
      plugins: ["timezone", "format"],
    });

    const pkg = generatePackageJson(config);

    expect(pkg.exports).toHaveProperty("./plugins/timezone");
    expect(pkg.exports).toHaveProperty("./plugins/format");
  });

  test("should include standard scripts", () => {
    const config = defineFotConfig({
      name: "@f-o-t/test",
      description: "Test library",
      entry: ["src/index.ts"],
    });

    const pkg = generatePackageJson(config);

    expect(pkg.scripts).toHaveProperty("build");
    expect(pkg.scripts).toHaveProperty("test");
    expect(pkg.scripts).toHaveProperty("typecheck");
  });

  test("should merge custom dependencies", () => {
    const config = defineFotConfig({
      name: "@f-o-t/test",
      description: "Test library",
      entry: ["src/index.ts"],
      dependencies: {
        "zod": "^3.0.0",
      },
    });

    const pkg = generatePackageJson(config);

    expect(pkg.dependencies).toHaveProperty("zod");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/config && bun test package-json`
Expected: FAIL - package-json.ts does not exist

**Step 3: Create package-json.ts generator**

Create: `libraries/config/src/generators/package-json.ts`

```typescript
import type { ResolvedFotConfig } from "../types.ts";

interface PackageJson {
  name: string;
  version: string;
  description: string;
  type: string;
  private: boolean;
  module: string;
  types: string;
  exports?: Record<string, unknown>;
  files: string[];
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional: boolean }>;
  license: string;
  repository: {
    type: string;
    url: string;
  };
  homepage: string;
  bugs: {
    url: string;
  };
  publishConfig: {
    access: string;
  };
}

/**
 * Generate package.json from FOT config
 */
export function generatePackageJson(config: ResolvedFotConfig): PackageJson {
  const exports: Record<string, unknown> = {
    ".": {
      bun: "./src/index.ts",
      import: {
        default: "./dist/index.js",
        types: "./dist/index.d.ts",
      },
      types: "./src/index.ts",
    },
  };

  // Add plugin exports
  for (const plugin of config.plugins) {
    exports[`./plugins/${plugin.name}`] = {
      bun: `./${plugin.entry}`,
      import: {
        default: `./dist/plugins/${plugin.name}/index.js`,
        types: `./dist/plugins/${plugin.name}/index.d.ts`,
      },
      types: `./${plugin.entry}`,
    };
  }

  // Add package.json export
  exports["./package.json"] = "./package.json";

  const defaultScripts = {
    build: "fot build",
    check: "fot check",
    dev: "fot dev",
    test: "fot test",
    typecheck: "fot typecheck",
  };

  const defaultDevDependencies = {
    "@f-o-t/cli": "workspace:*",
    "@f-o-t/config": "workspace:*",
    "@types/bun": "latest",
    typescript: "latest",
  };

  // Extract library name for homepage/bugs URLs
  const libraryName = config.name.replace("@f-o-t/", "");

  return {
    name: config.name,
    version: config.version,
    description: config.description,
    type: "module",
    private: false,
    module: "./dist/index.js",
    types: "./dist/index.d.ts",
    exports,
    files: ["dist"],
    scripts: {
      ...defaultScripts,
      ...config.scripts,
    },
    dependencies: Object.keys(config.dependencies).length > 0 ? config.dependencies : undefined,
    devDependencies: {
      ...defaultDevDependencies,
      ...config.devDependencies,
    },
    peerDependencies: Object.keys(config.peerDependencies).length > 0 ? config.peerDependencies : undefined,
    peerDependenciesMeta: Object.keys(config.peerDependencies).length > 0
      ? Object.fromEntries(
          Object.keys(config.peerDependencies).map((key) => [key, { optional: true }])
        )
      : undefined,
    license: config.license,
    repository: {
      type: "git",
      url: "https://github.com/F-O-T/libraries.git",
    },
    homepage: `https://github.com/F-O-T/libraries/blob/master/libraries/${libraryName}`,
    bugs: {
      url: "https://github.com/F-O-T/libraries/issues",
    },
    publishConfig: {
      access: "public",
    },
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd libraries/config && bun test package-json`
Expected: PASS

**Step 5: Create tsconfig generator**

Create: `libraries/config/src/generators/tsconfig.ts`

```typescript
import type { ResolvedFotConfig } from "../types.ts";

interface TSConfig {
  compilerOptions: Record<string, unknown>;
  exclude: string[];
  include: string[];
}

/**
 * Generate tsconfig.json from FOT config
 */
export function generateTSConfig(config: ResolvedFotConfig): TSConfig {
  return {
    compilerOptions: config.typescript,
    exclude: ["node_modules", "dist"],
    include: ["src/**/*"],
  };
}
```

**Step 6: Create biome generator**

Create: `libraries/config/src/generators/biome.ts`

```typescript
import type { ResolvedFotConfig } from "../types.ts";

/**
 * Generate biome.json from FOT config
 */
export function generateBiomeConfig(config: ResolvedFotConfig): Record<string, unknown> {
  return config.biome;
}
```

**Step 7: Create generators index**

Create: `libraries/config/src/generators/index.ts`

```typescript
export * from "./package-json.ts";
export * from "./tsconfig.ts";
export * from "./biome.ts";
```

**Step 8: Export generators from main index**

Modify: `libraries/config/src/index.ts`

```typescript
export * from "./types.ts";
export * from "./schemas.ts";
export * from "./factory.ts";
export * from "./generators/index.ts";
```

**Step 9: Run all tests**

Run: `cd libraries/config && bun test`
Expected: All tests PASS

**Step 10: Commit**

```bash
git add libraries/config/src/generators
git add libraries/config/src/index.ts
git commit -m "feat(config): add config file generators"
```

---

## Task 6: Build and Finalize Config Library

**Files:**
- Modify: `libraries/config/README.md`
- Modify: `libraries/config/src/index.ts`

**Step 1: Update README with usage examples**

Modify: `libraries/config/README.md`

```markdown
# @f-o-t/config

Standardized configuration for F-O-T libraries.

## Installation

\`\`\`bash
bun add -d @f-o-t/config @f-o-t/cli
\`\`\`

## Usage

Create a \`fot.config.ts\` file in your library:

\`\`\`typescript
import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
  name: '@f-o-t/my-library',
  description: 'My awesome library',
  entry: ['src/index.ts'],
});
\`\`\`

### With Plugins

\`\`\`typescript
export default defineFotConfig({
  name: '@f-o-t/datetime',
  description: 'Datetime library with plugins',
  entry: ['src/index.ts'],
  plugins: ['timezone', 'format', 'business-days'],
});
\`\`\`

### With Custom Options

\`\`\`typescript
export default defineFotConfig({
  name: '@f-o-t/my-library',
  description: 'My library',
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  typescript: {
    target: 'ES2020',
  },
  dependencies: {
    'zod': '^3.0.0',
  },
});
\`\`\`

## Generate Config Files

Use the \`@f-o-t/cli\` to generate config files:

\`\`\`bash
fot generate
\`\`\`

This will create/update:
- \`package.json\`
- \`tsconfig.json\`
- \`biome.json\`

## API

### \`defineFotConfig(config)\`

Define a library configuration with defaults.

**Options:**

- \`name\` (required) - Package name
- \`description\` (required) - Package description
- \`entry\` (required) - Entry point files
- \`plugins\` - Plugin names or configs
- \`format\` - Build formats (\`["esm"]\` by default)
- \`typescript\` - TypeScript compiler options override
- \`biome\` - Biome configuration override
- \`dependencies\` - Runtime dependencies
- \`devDependencies\` - Dev dependencies
- \`peerDependencies\` - Peer dependencies
- \`scripts\` - Custom npm scripts

### Generators

- \`generatePackageJson(config)\` - Generate package.json
- \`generateTSConfig(config)\` - Generate tsconfig.json
- \`generateBiomeConfig(config)\` - Generate biome.json
```

**Step 2: Remove placeholder from index.ts**

Modify: `libraries/config/src/index.ts`

Remove the placeholder line if it still exists, ensure all exports are present:

```typescript
export * from "./types.ts";
export * from "./schemas.ts";
export * from "./factory.ts";
export * from "./generators/index.ts";
```

**Step 3: Build the library**

Run:
```bash
cd libraries/config
bun run build
```

Expected: Build succeeds, dist/ contains all exports

**Step 4: Run all tests**

Run: `cd libraries/config && bun test`
Expected: All tests PASS

**Step 5: Typecheck**

Run: `cd libraries/config && bun run typecheck`
Expected: No errors

**Step 6: Check formatting**

Run: `cd libraries/config && bun run check`
Expected: No issues

**Step 7: Commit**

```bash
git add libraries/config
git commit -m "feat(config): finalize library with documentation"
```

---

## Summary

The \`@f-o-t/config\` library is now complete with:

1. ✅ Type-safe configuration types
2. ✅ Zod schemas for validation
3. ✅ \`defineFotConfig()\` factory with smart defaults
4. ✅ Config file generators (package.json, tsconfig.json, biome.json)
5. ✅ Comprehensive tests
6. ✅ Documentation

**Next Step:** Implement \`@f-o-t/cli\` to consume this config and provide the build tooling.
