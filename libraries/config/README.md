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
  generatePackageJson, 
  generateTsConfig, 
  generateBiomeConfig 
} from "@f-o-t/config";

// Generate package.json
const packageJson = generatePackageJson({
  name: "@f-o-t/my-library",
  version: "1.0.0",
  description: "My FOT library",
});

// Generate tsconfig.json
const tsconfig = generateTsConfig();

// Generate biome.json
const biomeConfig = generateBiomeConfig();
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
  typescript: Required<TypeScriptOptions>;
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
  declaration?: boolean;  // Generate .d.ts files (default: true)
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

### `generatePackageJson(options)`

Generates a standard package.json configuration for FOT libraries.

**Parameters:**
- `name`: Package name
- `version`: Package version
- `description`: Package description
- Additional package.json fields as needed

### `generateTsConfig()`

Generates a standard TypeScript configuration optimized for FOT libraries.

### `generateBiomeConfig()`

Generates a standard Biome configuration for linting and formatting.

## License

MIT
