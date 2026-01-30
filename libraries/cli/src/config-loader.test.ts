import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import { loadFotConfig, hasFotConfig } from "./config-loader";

describe("config-loader", () => {
  test("loads fot.config.ts from directory", async () => {
    const fixtureDir = join(__dirname, "__fixtures__", "basic-config");
    const config = await loadFotConfig(fixtureDir);

    expect(config).toBeDefined();
    expect(config.formats).toEqual(["esm", "cjs"]);
    expect(config.external).toEqual(["@f-o-t/config"]);
    expect(config.typescript.declaration).toBe(true);
  });

  test("throws error when config not found", async () => {
    const nonExistentDir = join(__dirname, "__fixtures__", "non-existent");

    await expect(loadFotConfig(nonExistentDir)).rejects.toThrow(
      "fot.config.ts not found"
    );
  });

  test("hasFotConfig returns true when config exists", () => {
    const fixtureDir = join(__dirname, "__fixtures__", "basic-config");
    expect(hasFotConfig(fixtureDir)).toBe(true);
  });

  test("hasFotConfig returns false when config does not exist", () => {
    const nonExistentDir = join(__dirname, "__fixtures__", "non-existent");
    expect(hasFotConfig(nonExistentDir)).toBe(false);
  });
});
