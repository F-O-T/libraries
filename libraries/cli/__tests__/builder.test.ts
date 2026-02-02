import { describe, test, expect, afterEach } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { buildLibrary } from "../src/builder";

describe("buildLibrary", () => {
  const fixtureDir = join(__dirname, "..", "src", "__fixtures__", "basic-config");
  const distDir = join(fixtureDir, "dist");

  afterEach(() => {
    if (existsSync(distDir)) {
      rmSync(distDir, { recursive: true, force: true });
    }
    // Clean up generated tsconfig.json
    const tsconfigPath = join(fixtureDir, "tsconfig.json");
    if (existsSync(tsconfigPath)) {
      rmSync(tsconfigPath);
    }
  });

  test("builds library to dist/", async () => {
    await buildLibrary({ cwd: fixtureDir });

    expect(existsSync(distDir)).toBe(true);
    expect(existsSync(join(distDir, "index.js"))).toBe(true);
    // Verify declaration files are generated
    expect(existsSync(join(distDir, "index.d.ts"))).toBe(true);
    // Verify sourcemaps are generated
    expect(existsSync(join(distDir, "index.js.map"))).toBe(true);
    expect(existsSync(join(distDir, "index.d.ts.map"))).toBe(true);
  });

  test("generates tsconfig.json during build", async () => {
    await buildLibrary({ cwd: fixtureDir });

    const tsconfigPath = join(fixtureDir, "tsconfig.json");
    expect(existsSync(tsconfigPath)).toBe(true);
  });

  test("throws when cwd has no fot.config.ts", async () => {
    await expect(buildLibrary({ cwd: "/nonexistent" })).rejects.toThrow(
      "fot.config.ts not found"
    );
  });
});
