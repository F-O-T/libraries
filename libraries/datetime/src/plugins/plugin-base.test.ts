import { describe, expect, test } from "bun:test";
import { DateTime } from "../core/datetime.ts";
import type { DateTimeClass } from "../types.ts";
import {
   createPlugin,
   isPlugin,
   isValidPluginName,
} from "./plugin-base.ts";

describe("createPlugin", () => {
   test("creates a valid plugin object", () => {
      const plugin = createPlugin("test-plugin", (DateTimeClass) => {
         // Plugin logic
      });

      expect(plugin).toHaveProperty("name", "test-plugin");
      expect(plugin).toHaveProperty("install");
      expect(typeof plugin.install).toBe("function");
   });

   test("throws error for empty name", () => {
      expect(() => {
         createPlugin("", () => {});
      }).toThrow("Plugin name must be a non-empty string");
   });

   test("throws error for non-string name", () => {
      expect(() => {
         createPlugin(123 as any, () => {});
      }).toThrow("Plugin name must be a non-empty string");

      expect(() => {
         createPlugin(null as any, () => {});
      }).toThrow("Plugin name must be a non-empty string");

      expect(() => {
         createPlugin(undefined as any, () => {});
      }).toThrow("Plugin name must be a non-empty string");
   });

   test("throws error for non-function install", () => {
      expect(() => {
         createPlugin("test", "not-a-function" as any);
      }).toThrow("Plugin install must be a function");

      expect(() => {
         createPlugin("test", null as any);
      }).toThrow("Plugin install must be a function");

      expect(() => {
         createPlugin("test", undefined as any);
      }).toThrow("Plugin install must be a function");
   });

   test("creates plugin with various name formats", () => {
      const plugins = [
         createPlugin("camelCase", () => {}),
         createPlugin("kebab-case", () => {}),
         createPlugin("snake_case", () => {}),
         createPlugin("with123numbers", () => {}),
      ];

      plugins.forEach((plugin, i) => {
         expect(plugin).toHaveProperty("name");
         expect(plugin).toHaveProperty("install");
         expect(typeof plugin.install).toBe("function");
      });
   });
});

describe("isPlugin", () => {
   test("returns true for valid plugin objects", () => {
      const plugin = createPlugin("test", () => {});
      expect(isPlugin(plugin)).toBe(true);

      const manualPlugin = {
         name: "manual-plugin",
         install: () => {},
      };
      expect(isPlugin(manualPlugin)).toBe(true);
   });

   test("returns false for invalid objects", () => {
      expect(isPlugin(null)).toBe(false);
      expect(isPlugin(undefined)).toBe(false);
      expect(isPlugin("string")).toBe(false);
      expect(isPlugin(123)).toBe(false);
      expect(isPlugin([])).toBe(false);
   });

   test("returns false for objects missing required properties", () => {
      expect(isPlugin({ name: "test" })).toBe(false);
      expect(isPlugin({ install: () => {} })).toBe(false);
      expect(isPlugin({})).toBe(false);
   });

   test("returns false for objects with invalid property types", () => {
      expect(
         isPlugin({
            name: 123,
            install: () => {},
         }),
      ).toBe(false);

      expect(
         isPlugin({
            name: "test",
            install: "not-a-function",
         }),
      ).toBe(false);

      expect(
         isPlugin({
            name: "",
            install: () => {},
         }),
      ).toBe(false);
   });
});

describe("isValidPluginName", () => {
   test("returns true for valid plugin names", () => {
      expect(isValidPluginName("test")).toBe(true);
      expect(isValidPluginName("test-plugin")).toBe(true);
      expect(isValidPluginName("testPlugin")).toBe(true);
      expect(isValidPluginName("test_plugin")).toBe(true);
      expect(isValidPluginName("test123")).toBe(true);
      expect(isValidPluginName("TEST")).toBe(true);
      expect(isValidPluginName("my-awesome-plugin")).toBe(true);
   });

   test("returns false for invalid plugin names", () => {
      expect(isValidPluginName("")).toBe(false);
      expect(isValidPluginName("a")).toBe(false); // Too short
      expect(isValidPluginName("test plugin")).toBe(false); // Space
      expect(isValidPluginName("test@plugin")).toBe(false); // Special char
      expect(isValidPluginName("test.plugin")).toBe(false); // Period
      expect(isValidPluginName("test/plugin")).toBe(false); // Slash
      expect(isValidPluginName("-test")).toBe(false); // Starts with hyphen
      expect(isValidPluginName("test-")).toBe(false); // Ends with hyphen
      expect(isValidPluginName("_test")).toBe(false); // Starts with underscore
      expect(isValidPluginName("test_")).toBe(false); // Ends with underscore
   });

   test("returns false for non-string values", () => {
      expect(isValidPluginName(null as any)).toBe(false);
      expect(isValidPluginName(undefined as any)).toBe(false);
      expect(isValidPluginName(123 as any)).toBe(false);
      expect(isValidPluginName({} as any)).toBe(false);
      expect(isValidPluginName([] as any)).toBe(false);
   });
});

describe("plugin integration", () => {
   test("createPlugin works with DateTime.extend", () => {
      const plugin = createPlugin("test-integration", (DateTimeClass) => {
         // Add a test method to the prototype
         (DateTimeClass.prototype as any).testMethod = function () {
            return "test-result";
         };
      });

      // Register the plugin
      DateTime.extend(plugin);

      // Check that plugin is registered
      expect(DateTime.hasPlugin("test-integration")).toBe(true);

      // Check that method was added
      const dt = new DateTime();
      expect((dt as any).testMethod()).toBe("test-result");
   });

   test("plugin install function receives options", () => {
      let receivedOptions: Record<string, unknown> | undefined;

      const plugin = createPlugin(
         "test-options",
         (DateTimeClass, options) => {
            receivedOptions = options;
         },
      );

      const options = { foo: "bar", baz: 123 };
      DateTime.extend(plugin, options);

      expect(receivedOptions).toEqual(options);
   });

   test("plugin can add static methods", () => {
      const plugin = createPlugin("test-static", (DateTimeClass) => {
         (DateTimeClass as any).staticMethod = function () {
            return new DateTimeClass();
         };
      });

      DateTime.extend(plugin);

      expect(typeof (DateTime as any).staticMethod).toBe("function");
      expect((DateTime as any).staticMethod()).toBeInstanceOf(DateTime);
   });

   test("multiple plugins can be registered", () => {
      const plugin1 = createPlugin("multi-plugin-1", (DateTimeClass) => {
         (DateTimeClass.prototype as any).method1 = () => "method1";
      });

      const plugin2 = createPlugin("multi-plugin-2", (DateTimeClass) => {
         (DateTimeClass.prototype as any).method2 = () => "method2";
      });

      DateTime.extend(plugin1);
      DateTime.extend(plugin2);

      expect(DateTime.hasPlugin("multi-plugin-1")).toBe(true);
      expect(DateTime.hasPlugin("multi-plugin-2")).toBe(true);

      const dt = new DateTime();
      expect((dt as any).method1()).toBe("method1");
      expect((dt as any).method2()).toBe("method2");
   });
});
