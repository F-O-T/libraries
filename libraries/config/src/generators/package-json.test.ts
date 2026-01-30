import { describe, expect, it } from "bun:test";
import type { ResolvedFotConfig } from "../types";
import { generatePackageJson } from "./package-json";

describe("generatePackageJson", () => {
   it("should generate basic package.json structure", () => {
      const config: ResolvedFotConfig = {
         formats: ["esm"],
         external: [],
         typescript: { declaration: true },
         biome: { enabled: true },
         plugins: [],
      };

      const pkg = generatePackageJson("my-library", "1.0.0", config);

      expect(pkg.name).toBe("@f-o-t/my-library");
      expect(pkg.version).toBe("1.0.0");
      expect(pkg.type).toBe("module");
      expect(pkg.main).toBe("./dist/index.js");
      expect(pkg.types).toBe("./dist/index.d.ts");
      expect(pkg.repository).toEqual({
         type: "git",
         url: "https://github.com/F-O-T/libraries.git",
         directory: "libraries/my-library",
      });
      expect(pkg.devDependencies).toHaveProperty("@f-o-t/cli", "workspace:*");
      expect(pkg.devDependencies).toHaveProperty(
         "@f-o-t/config",
         "workspace:*",
      );
   });

   it("should generate exports for main entry", () => {
      const config: ResolvedFotConfig = {
         formats: ["esm"],
         external: [],
         typescript: { declaration: true },
         biome: { enabled: true },
         plugins: [],
      };

      const pkg = generatePackageJson("my-library", "1.0.0", config);

      expect(pkg.exports["."]).toBeDefined();
      expect(pkg.exports["."]).toEqual({
         types: "./dist/index.d.ts",
         default: "./dist/index.js",
      });
   });

   it("should generate exports for plugins", () => {
      const config: ResolvedFotConfig = {
         formats: ["esm"],
         external: [],
         typescript: { declaration: true },
         biome: { enabled: true },
         plugins: [
            { name: "auth", enabled: true },
            { name: "validation", enabled: true },
         ],
      };

      const pkg = generatePackageJson("my-library", "1.0.0", config);

      expect(pkg.exports["./plugins/auth"]).toBeDefined();
      expect(pkg.exports["./plugins/auth"]).toEqual({
         types: "./dist/plugins/auth.d.ts",
         default: "./dist/plugins/auth.js",
      });

      expect(pkg.exports["./plugins/validation"]).toBeDefined();
      expect(pkg.exports["./plugins/validation"]).toEqual({
         types: "./dist/plugins/validation.d.ts",
         default: "./dist/plugins/validation.js",
      });
   });

   it("should include standard scripts", () => {
      const config: ResolvedFotConfig = {
         formats: ["esm"],
         external: [],
         typescript: { declaration: true },
         biome: { enabled: true },
         plugins: [],
      };

      const pkg = generatePackageJson("my-library", "1.0.0", config);

      expect(pkg.scripts).toEqual({
         build: "fot build",
         test: "fot test",
         lint: "fot lint",
         format: "fot format",
      });
   });

   it("should merge custom dependencies", () => {
      const config: ResolvedFotConfig = {
         formats: ["esm"],
         external: ["zod", "react"],
         typescript: { declaration: true },
         biome: { enabled: true },
         plugins: [],
      };

      const customDeps = {
         zod: "^3.22.0",
         react: "^18.0.0",
      };

      const pkg = generatePackageJson(
         "my-library",
         "1.0.0",
         config,
         customDeps,
      );

      expect(pkg.dependencies).toEqual({
         zod: "^3.22.0",
         react: "^18.0.0",
      });
      expect(pkg.devDependencies).toHaveProperty("@f-o-t/cli", "workspace:*");
      expect(pkg.devDependencies).toHaveProperty(
         "@f-o-t/config",
         "workspace:*",
      );
   });
});
