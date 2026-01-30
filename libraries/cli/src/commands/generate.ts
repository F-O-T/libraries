import { writeFileSync } from "node:fs";
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
 * @param cwd - The directory containing the fot.config.ts file
 */
export async function generateConfigFiles(cwd: string): Promise<void> {
  console.log("Loading fot.config.ts...");
  const config = await loadFotConfig(cwd);

  console.log("Generating package.json...");
  // Extract library name from directory name or use a default
  const libraryName = cwd.split("/").pop() || "library";
  const packageJson = generatePackageJson(libraryName, "0.1.0", config);
  const packageJsonPath = join(cwd, "package.json");
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
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
