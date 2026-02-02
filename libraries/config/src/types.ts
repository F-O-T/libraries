/**
 * Build output formats
 */
export type BuildFormat = "esm" | "cjs";

/**
 * TypeScript compiler options for the build
 */
export interface TypeScriptOptions {
   /**
    * Generate .d.ts declaration files
    * @default true
    */
   declaration?: boolean;
   /**
    * Use isolated declarations mode for faster, more memory-efficient declaration generation
    * Requires TypeScript 5.5+
    * @default false
    */
   isolatedDeclarations?: boolean;
   /**
    * Maximum memory (in MB) to allocate for TypeScript declaration generation
    * Useful for large libraries with complex types
    * @default undefined (uses Node.js default ~2GB)
    */
   maxMemory?: number;
}

/**
 * Biome configuration options
 */
export interface BiomeOptions {
   /**
    * Enable Biome for linting/formatting
    * @default true
    */
   enabled?: boolean;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
   /**
    * Name of the plugin
    */
   name: string;
   /**
    * Whether the plugin is enabled
    * @default true
    */
   enabled?: boolean;
}

/**
 * User-provided configuration for FOT libraries
 */
export interface FotConfig {
   /**
    * Build output formats
    * @default ["esm"]
    */
   formats?: BuildFormat[];
   /**
    * External dependencies that should not be bundled
    * @default []
    */
   external?: string[];
   /**
    * TypeScript options
    */
   typescript?: TypeScriptOptions;
   /**
    * Biome options
    */
   biome?: BiomeOptions;
   /**
    * Plugins to load - can be plugin names as strings or config objects
    * @default []
    */
   plugins?: (string | PluginConfig)[];
}

/**
 * Resolved configuration with all defaults applied
 */
export interface ResolvedFotConfig {
   /**
    * Build output formats
    */
   formats: BuildFormat[];
   /**
    * External dependencies that should not be bundled
    */
   external: string[];
   /**
    * TypeScript options
    */
   typescript: Required<TypeScriptOptions>;
   /**
    * Biome options
    */
   biome: Required<BiomeOptions>;
   /**
    * Plugins to load (normalized to config objects)
    */
   plugins: PluginConfig[];
}
