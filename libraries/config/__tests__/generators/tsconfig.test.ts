import { describe, expect, it } from "bun:test";
import { generateTSConfig } from "../../src/generators/tsconfig";
import type { ResolvedFotConfig } from "../../src/types";

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

   it("should enable TypeScript import extensions", () => {
      const tsconfig = generateTSConfig(baseConfig);

      expect(tsconfig.compilerOptions.allowImportingTsExtensions).toBe(true);
   });

   it("should force module detection", () => {
      const tsconfig = generateTSConfig(baseConfig);

      expect(tsconfig.compilerOptions.moduleDetection).toBe("force");
   });

   it("should enable noEmit for type checking only", () => {
      const tsconfig = generateTSConfig(baseConfig);

      expect(tsconfig.compilerOptions.noEmit).toBe(true);
   });

   it("should enable noFallthroughCasesInSwitch for safety", () => {
      const tsconfig = generateTSConfig(baseConfig);

      expect(tsconfig.compilerOptions.noFallthroughCasesInSwitch).toBe(true);
   });

   it("should enable noImplicitOverride", () => {
      const tsconfig = generateTSConfig(baseConfig);

      expect(tsconfig.compilerOptions.noImplicitOverride).toBe(true);
   });

   it("should disable noPropertyAccessFromIndexSignature for flexibility", () => {
      const tsconfig = generateTSConfig(baseConfig);

      expect(tsconfig.compilerOptions.noPropertyAccessFromIndexSignature).toBe(
         false,
      );
   });

   it("should enable noUncheckedIndexedAccess for safety", () => {
      const tsconfig = generateTSConfig(baseConfig);

      expect(tsconfig.compilerOptions.noUncheckedIndexedAccess).toBe(true);
   });

   it("should disable noUnusedLocals to avoid build errors", () => {
      const tsconfig = generateTSConfig(baseConfig);

      expect(tsconfig.compilerOptions.noUnusedLocals).toBe(false);
   });

   it("should disable noUnusedParameters to avoid build errors", () => {
      const tsconfig = generateTSConfig(baseConfig);

      expect(tsconfig.compilerOptions.noUnusedParameters).toBe(false);
   });

   it("should enable skipLibCheck for faster builds", () => {
      const tsconfig = generateTSConfig(baseConfig);

      expect(tsconfig.compilerOptions.skipLibCheck).toBe(true);
   });

   it("should enable verbatimModuleSyntax", () => {
      const tsconfig = generateTSConfig(baseConfig);

      expect(tsconfig.compilerOptions.verbatimModuleSyntax).toBe(true);
   });

   it("should exclude bunup.config.ts from compilation", () => {
      const tsconfig = generateTSConfig(baseConfig);

      expect(tsconfig.exclude).toContain("bunup.config.ts");
   });
});
