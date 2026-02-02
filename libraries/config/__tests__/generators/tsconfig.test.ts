import { describe, expect, it } from "bun:test";
import type { ResolvedFotConfig } from "../../src/types";
import { generateTSConfig } from "../../src/generators/tsconfig";

describe("generateTSConfig", () => {
   const baseConfig: ResolvedFotConfig = {
      formats: ["esm"],
      external: [],
      typescript: { declaration: true, isolatedDeclarations: false },
      biome: { enabled: true },
      plugins: [],
   };

   it("should generate valid tsconfig structure", () => {
      const tsconfig = generateTSConfig(baseConfig);

      expect(tsconfig.compilerOptions).toBeDefined();
      expect(tsconfig.include).toContain("src/**/*");
      expect(tsconfig.exclude).toContain("node_modules");
      expect(tsconfig.exclude).toContain("dist");
   });

   it("should respect declaration setting", () => {
      const tsconfig = generateTSConfig(baseConfig);
      expect(tsconfig.compilerOptions.declaration).toBe(true);

      const noDecl: ResolvedFotConfig = {
         ...baseConfig,
         typescript: { declaration: false, isolatedDeclarations: false },
      };
      const tsconfig2 = generateTSConfig(noDecl);
      expect(tsconfig2.compilerOptions.declaration).toBe(false);
   });

   it("should respect isolatedDeclarations setting", () => {
      const config: ResolvedFotConfig = {
         ...baseConfig,
         typescript: { declaration: true, isolatedDeclarations: true },
      };
      const tsconfig = generateTSConfig(config);

      expect(tsconfig.compilerOptions.isolatedDeclarations).toBe(true);
   });

   it("should use strict mode", () => {
      const tsconfig = generateTSConfig(baseConfig);

      expect(tsconfig.compilerOptions.strict).toBe(true);
   });

   it("should target ES2023", () => {
      const tsconfig = generateTSConfig(baseConfig);

      expect(tsconfig.compilerOptions.target).toBe("ES2023");
   });

   it("should use bundler module resolution", () => {
      const tsconfig = generateTSConfig(baseConfig);

      expect(tsconfig.compilerOptions.module).toBe("Preserve");
      expect(tsconfig.compilerOptions.moduleResolution).toBe("bundler");
   });
});
