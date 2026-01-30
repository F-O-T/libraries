import type { FotConfig, ResolvedFotConfig } from "./types";
import { fotConfigSchema } from "./schemas";

/**
 * Factory function to define a FOT library configuration
 * Validates the config against the schema and applies defaults
 *
 * @param config - The library configuration
 * @returns The validated and normalized configuration with defaults applied
 * @throws {Error} If the configuration is invalid
 */
export function defineFotConfig(config: FotConfig = {}): ResolvedFotConfig {
  // Validate against schema (schema handles defaults and normalization)
  const result = fotConfigSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    throw new Error(`Invalid FOT configuration: ${errors}`);
  }

  return result.data;
}
