import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  generatePackageJson,
  generateTSConfig,
  generateBiomeConfig,
} from "@f-o-t/config";
import { loadFotConfig } from "../config-loader";

/**
 * Generate configuration files (package.json, tsconfig.json, biome.json) from fot.config.ts
 *
 * Merges generated fields into existing package.json, preserving
 * description, dependencies, peerDependencies, and other custom fields.
 *
 * @param cwd - The directory containing the fot.config.ts file
 */
export async function generateConfigFiles(cwd: string): Promise<void> {
  console.log("Loading fot.config.ts...");
  const config = await loadFotConfig(cwd);

  console.log("Generating package.json...");
  const packageJsonPath = join(cwd, "package.json");
  const libraryName = cwd.split("/").pop() || "library";

  // Read existing package.json to preserve custom fields
  let existing: Record<string, unknown> = {};
  if (existsSync(packageJsonPath)) {
    existing = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  }

  const version = (existing.version as string) || "0.1.0";
  const generated = generatePackageJson(libraryName, version, config);

  // Merge: generated fields override, but preserve everything else
  const merged = {
    ...existing,
    ...generated,
  };

  writeFileSync(packageJsonPath, JSON.stringify(merged, null, 2) + "\n");
  console.log(`✓ Generated ${packageJsonPath}`);

  console.log("Generating tsconfig.json...");
  const tsconfig = generateTSConfig(config);
  const tsconfigPath = join(cwd, "tsconfig.json");
  writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + "\n");
  console.log(`✓ Generated ${tsconfigPath}`);

  console.log("Generating biome.json...");
  const biomeConfig = generateBiomeConfig(config);
  const biomeConfigPath = join(cwd, "biome.json");
  writeFileSync(biomeConfigPath, JSON.stringify(biomeConfig, null, 2) + "\n");
  console.log(`✓ Generated ${biomeConfigPath}`);

  console.log("All configuration files generated successfully!");
}
