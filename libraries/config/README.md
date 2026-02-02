# @f-o-t/config

Standardized configuration for F-O-T libraries. Provides a type-safe configuration system with validation, plugins, and config file generators.

## Installation

```bash
bun add @f-o-t/config
```

## Usage

### Basic Usage

The simplest way to use `@f-o-t/config` is to call `defineFotConfig()` with no arguments to get default configuration:

```typescript
import { defineFotConfig } from "@f-o-t/config";

const config = defineFotConfig();
// Returns default config with ESM format, TypeScript declarations, and Biome enabled
```

### With Custom Options

Customize the configuration by passing options:

```typescript
import { defineFotConfig } from "@f-o-t/config";

const config = defineFotConfig({
  formats: ["esm", "cjs"],
  external: ["react", "react-dom"],
  typescript: {
    declaration: true,
    isolatedDeclarations: false,
    maxMemory: 4096,
  },
  biome: {
    enabled: true,
  },
});
```

### With Plugins

Enable and configure plugins:

```typescript
import { defineFotConfig } from "@f-o-t/config";

const config = defineFotConfig({
  plugins: [
    { name: "datetime", enabled: true },
    { name: "pdf", enabled: false },
  ],
});
```

## Generate Config Files

The library provides generators to create standard configuration files for your FOT library:

```typescript
import { 
  defineFotConfig,
  generatePackageJson, 
  generateTSConfig, 
  generateBiomeConfig 
} from "@f-o-t/config";

// First, define your configuration
const config = defineFotConfig({
  external: ["zod"],
  plugins: ["operators"],
});

// Generate package.json
const packageJson = generatePackageJson(
  "my-library",  // library name (without @f-o-t/ prefix)
  "1.0.0",       // version
  config,        // resolved config
  { "zod": "^4.3.6" }  // optional custom dependencies
);

// Generate tsconfig.json
const tsconfig = generateTSConfig(config);

// Generate biome.json
const biomeConfig = generateBiomeConfig(config);
```

## API Reference

### `defineFotConfig(config?: FotConfig): ResolvedFotConfig`

Main factory function to define and validate a FOT library configuration.

**Parameters:**
- `config` (optional): Configuration object

**Returns:** Validated configuration with all defaults applied

**Throws:** Error if configuration is invalid

### Types

#### `FotConfig`

User-provided configuration:

```typescript
interface FotConfig {
  formats?: BuildFormat[];        // Build output formats (default: ["esm"])
  external?: string[];            // External dependencies (default: [])
  typescript?: TypeScriptOptions; // TypeScript options
  biome?: BiomeOptions;          // Biome options
  plugins?: PluginConfig[];      // Plugin configurations (default: [])
}
```

#### `ResolvedFotConfig`

Fully resolved configuration with all defaults applied:

```typescript
interface ResolvedFotConfig {
  formats: BuildFormat[];
  external: string[];
  typescript: {
    declaration: boolean;
    isolatedDeclarations: boolean;
    maxMemory?: number;
  };
  biome: Required<BiomeOptions>;
  plugins: PluginConfig[];
}
```

#### `BuildFormat`

```typescript
type BuildFormat = "esm" | "cjs";
```

#### `TypeScriptOptions`

```typescript
interface TypeScriptOptions {
  declaration?: boolean;          // Generate .d.ts files (default: true)
  isolatedDeclarations?: boolean; // Use isolated declarations mode for faster, more memory-efficient declaration generation (default: false)
  maxMemory?: number;             // Maximum memory (in MB) to allocate for TypeScript declaration generation (default: undefined)
}
```

#### `BiomeOptions`

```typescript
interface BiomeOptions {
  enabled?: boolean;  // Enable Biome (default: true)
}
```

#### `PluginConfig`

```typescript
interface PluginConfig {
  name: string;      // Plugin name
  enabled?: boolean; // Enable plugin (default: true)
}
```

## Generators

### `generatePackageJson(libraryName, version, config, customDependencies?)`

Generates a standard package.json configuration for FOT libraries.

**Parameters:**
- `libraryName`: Library name (without `@f-o-t/` prefix)
- `version`: Package version
- `config`: Resolved FOT configuration (`ResolvedFotConfig`)
- `customDependencies` (optional): Custom dependencies to include in the package.json

**Returns:** `PackageJson` object

**Example:**
```typescript
const pkg = generatePackageJson(
  "my-library",
  "1.0.0",
  config,
  { "zod": "^4.3.6" }
);
```

### `generateTSConfig(config)`

Generates a standard TypeScript configuration optimized for FOT libraries.

**Parameters:**
- `config`: Resolved FOT configuration (`ResolvedFotConfig`)

**Returns:** `TSConfig` object

**Example:**
```typescript
const tsconfig = generateTSConfig(config);
```

### `generateBiomeConfig(config)`

Generates a standard Biome configuration for linting and formatting.

**Parameters:**
- `config`: Resolved FOT configuration (`ResolvedFotConfig`)

**Returns:** `BiomeConfig` object

**Example:**
```typescript
const biomeConfig = generateBiomeConfig(config);
```

## License

MIT
