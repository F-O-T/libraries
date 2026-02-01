import { describe, expect, it } from "bun:test";
import type {
   BiomeOptions,
   BuildFormat,
   FotConfig,
   PluginConfig,
   ResolvedFotConfig,
   TypeScriptOptions,
} from "../src/types.ts";

describe("BuildFormat", () => {
   it("should accept valid build formats", () => {
      const formats: BuildFormat[] = ["esm", "cjs"];
      expect(formats).toContain("esm");
      expect(formats).toContain("cjs");
   });
});

describe("TypeScriptOptions", () => {
   it("should allow optional declaration property", () => {
      const options1: TypeScriptOptions = { declaration: true };
      const options2: TypeScriptOptions = {};
      expect(options1.declaration).toBe(true);
      expect(options2.declaration).toBeUndefined();
   });
});

describe("BiomeOptions", () => {
   it("should allow optional enabled property", () => {
      const options1: BiomeOptions = { enabled: true };
      const options2: BiomeOptions = {};
      expect(options1.enabled).toBe(true);
      expect(options2.enabled).toBeUndefined();
   });
});

describe("PluginConfig", () => {
   it("should require name and optional enabled", () => {
      const plugin1: PluginConfig = { name: "test-plugin" };
      const plugin2: PluginConfig = { name: "test-plugin", enabled: false };
      expect(plugin1.name).toBe("test-plugin");
      expect(plugin1.enabled).toBeUndefined();
      expect(plugin2.enabled).toBe(false);
   });
});

describe("FotConfig", () => {
   it("should allow minimal config", () => {
      const config: FotConfig = {};
      expect(config).toBeDefined();
   });

   it("should allow full config", () => {
      const config: FotConfig = {
         formats: ["esm", "cjs"],
         external: ["react"],
         typescript: { declaration: true },
         biome: { enabled: false },
         plugins: [{ name: "my-plugin", enabled: true }],
      };
      expect(config.formats).toEqual(["esm", "cjs"]);
      expect(config.external).toEqual(["react"]);
      expect(config.typescript?.declaration).toBe(true);
      expect(config.biome?.enabled).toBe(false);
      expect(config.plugins).toHaveLength(1);
   });
});

describe("ResolvedFotConfig", () => {
   it("should require all properties", () => {
      const config: ResolvedFotConfig = {
         formats: ["esm"],
         external: [],
         typescript: { declaration: true },
         biome: { enabled: true },
         plugins: [],
      };
      expect(config.formats).toEqual(["esm"]);
      expect(config.external).toEqual([]);
      expect(config.typescript.declaration).toBe(true);
      expect(config.biome.enabled).toBe(true);
      expect(config.plugins).toEqual([]);
   });
});
