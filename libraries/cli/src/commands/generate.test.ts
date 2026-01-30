import { describe, test, expect, afterEach } from "bun:test";
import { rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { generateConfigFiles } from "./generate";

describe("generate command", () => {
  const fixtureDir = join(__dirname, "..", "__fixtures__", "basic-config");
  const packageJsonPath = join(fixtureDir, "package.json");
  const tsconfigPath = join(fixtureDir, "tsconfig.json");
  const biomeConfigPath = join(fixtureDir, "biome.json");

  afterEach(() => {
    // Clean up generated files after each test
    if (existsSync(packageJsonPath)) {
      rmSync(packageJsonPath);
    }
    if (existsSync(tsconfigPath)) {
      rmSync(tsconfigPath);
    }
    if (existsSync(biomeConfigPath)) {
      rmSync(biomeConfigPath);
    }
  });

  test("generates package.json", async () => {
    // Generate config files
    await generateConfigFiles(fixtureDir);

    // Verify package.json exists
    expect(existsSync(packageJsonPath)).toBe(true);

    // Verify package.json content
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    expect(packageJson).toBeDefined();
    expect(packageJson.name).toBeDefined();
    expect(packageJson.version).toBeDefined();
    expect(packageJson.type).toBe("module");
  });

  test("generates tsconfig.json", async () => {
    // Generate config files
    await generateConfigFiles(fixtureDir);

    // Verify tsconfig.json exists
    expect(existsSync(tsconfigPath)).toBe(true);

    // Verify tsconfig.json content
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8"));
    expect(tsconfig).toBeDefined();
    expect(tsconfig.compilerOptions).toBeDefined();
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.declaration).toBe(true);
  });

  test("generates biome.json", async () => {
    // Generate config files
    await generateConfigFiles(fixtureDir);

    // Verify biome.json exists
    expect(existsSync(biomeConfigPath)).toBe(true);

    // Verify biome.json content
    const biomeConfig = JSON.parse(readFileSync(biomeConfigPath, "utf-8"));
    expect(biomeConfig).toBeDefined();
    expect(biomeConfig.$schema).toBeDefined();
    expect(biomeConfig.formatter).toBeDefined();
    expect(biomeConfig.linter).toBeDefined();
  });
});
