import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ResolvedFotConfig } from "@f-o-t/config";

/**
 * Checks if a fot.config.ts file exists in the given directory
 *
 * @param cwd - The directory to check
 * @returns True if fot.config.ts exists, false otherwise
 */
export function hasFotConfig(cwd: string): boolean {
  const configPath = join(cwd, "fot.config.ts");
  return existsSync(configPath);
}

/**
 * Loads and validates a fot.config.ts file from the given directory
 *
 * @param cwd - The directory containing the fot.config.ts file
 * @returns The resolved FOT configuration
 * @throws {Error} If the config file is not found or has no default export
 */
export async function loadFotConfig(cwd: string): Promise<ResolvedFotConfig> {
  const configPath = join(cwd, "fot.config.ts");

  if (!existsSync(configPath)) {
    throw new Error(
      `fot.config.ts not found in ${cwd}. Please create a fot.config.ts file.`
    );
  }

  try {
    // Dynamic import to load the config file
    const configModule = await import(configPath);

    if (!configModule.default) {
      throw new Error(
        `fot.config.ts in ${cwd} must have a default export. Use 'export default defineFotConfig({ ... })'.`
      );
    }

    return configModule.default as ResolvedFotConfig;
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error instanceof Error && error.message.includes("fot.config.ts")) {
      throw error;
    }

    // Otherwise, wrap the error with more context
    throw new Error(
      `Failed to load fot.config.ts from ${cwd}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
