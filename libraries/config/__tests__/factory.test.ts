import { describe, expect, test } from "bun:test";
import { defineFotConfig } from "../src/factory";

describe("defineFotConfig", () => {
   test("applies defaults for formats", () => {
      const config = defineFotConfig({});

      expect(config.formats).toEqual(["esm"]);
      expect(config.external).toEqual([]);
      expect(config.typescript.declaration).toBe(true);
      expect(config.biome.enabled).toBe(true);
   });

   test("normalizes string plugins to config objects", () => {
      const config = defineFotConfig({
         plugins: ["zod"],
      });

      expect(config.plugins).toEqual([
         {
            name: "zod",
            enabled: true,
         },
      ]);
   });

   test("preserves plugin config objects", () => {
      const config = defineFotConfig({
         plugins: [
            {
               name: "zod",
               enabled: false,
            },
         ],
      });

      expect(config.plugins).toEqual([
         {
            name: "zod",
            enabled: false,
         },
      ]);
   });

   test("merges typescript options with defaults", () => {
      const config = defineFotConfig({
         typescript: {
            declaration: false,
         },
      });

      expect(config.typescript.declaration).toBe(false);
   });

   test("applies default TypeScript options when not provided", () => {
      const config = defineFotConfig({});

      expect(config.typescript.declaration).toBe(true);
   });

   test("throws on invalid config", () => {
      expect(() =>
         defineFotConfig({
            // @ts-expect-error - testing invalid config
            formats: ["invalid"],
         }),
      ).toThrow();

      expect(() =>
         defineFotConfig({
            external: ["Invalid-Package-Name"],
         }),
      ).toThrow();
   });

   test("handles mixed plugin definitions", () => {
      const config = defineFotConfig({
         plugins: [
            "zod",
            {
               name: "yup",
               enabled: false,
            },
            "joi",
         ],
      });

      expect(config.plugins).toEqual([
         {
            name: "zod",
            enabled: true,
         },
         {
            name: "yup",
            enabled: false,
         },
         {
            name: "joi",
            enabled: true,
         },
      ]);
   });

   test("allows custom formats", () => {
      const config = defineFotConfig({
         formats: ["esm", "cjs"],
      });

      expect(config.formats).toEqual(["esm", "cjs"]);
   });

   test("allows custom external dependencies", () => {
      const config = defineFotConfig({
         external: ["react", "@types/node"],
      });

      expect(config.external).toEqual(["react", "@types/node"]);
   });
});
