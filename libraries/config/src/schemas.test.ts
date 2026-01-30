import { describe, expect, it } from "bun:test";
import {
	biomeOptionsSchema,
	buildFormatSchema,
	fotConfigSchema,
	pluginConfigSchema,
	typeScriptOptionsSchema,
} from "./schemas.ts";

describe("buildFormatSchema", () => {
	it("should accept valid formats", () => {
		expect(buildFormatSchema.parse("esm")).toBe("esm");
		expect(buildFormatSchema.parse("cjs")).toBe("cjs");
	});

	it("should reject invalid formats", () => {
		expect(() => buildFormatSchema.parse("invalid")).toThrow();
		expect(() => buildFormatSchema.parse("umd")).toThrow();
	});
});

describe("pluginConfigSchema", () => {
	it("should accept string plugin name", () => {
		const result = pluginConfigSchema.parse("my-plugin");
		expect(result).toEqual({ name: "my-plugin", enabled: true });
	});

	it("should accept plugin config object", () => {
		const result = pluginConfigSchema.parse({
			name: "my-plugin",
			enabled: false,
		});
		expect(result).toEqual({ name: "my-plugin", enabled: false });
	});

	it("should default enabled to true", () => {
		const result = pluginConfigSchema.parse({ name: "my-plugin" });
		expect(result.enabled).toBe(true);
	});
});

describe("typeScriptOptionsSchema", () => {
	it("should accept valid options", () => {
		const result = typeScriptOptionsSchema.parse({ declaration: false });
		expect(result.declaration).toBe(false);
	});

	it("should default declaration to true", () => {
		const result = typeScriptOptionsSchema.parse({});
		expect(result.declaration).toBe(true);
	});
});

describe("biomeOptionsSchema", () => {
	it("should accept valid options", () => {
		const result = biomeOptionsSchema.parse({ enabled: false });
		expect(result.enabled).toBe(false);
	});

	it("should default enabled to true", () => {
		const result = biomeOptionsSchema.parse({});
		expect(result.enabled).toBe(true);
	});
});

describe("fotConfigSchema", () => {
	it("should accept minimal valid config", () => {
		const result = fotConfigSchema.parse({});
		expect(result.formats).toEqual(["esm"]);
		expect(result.external).toEqual([]);
		expect(result.typescript.declaration).toBe(true);
		expect(result.biome.enabled).toBe(true);
		expect(result.plugins).toEqual([]);
	});

	it("should reject invalid package names in external", () => {
		expect(() =>
			fotConfigSchema.parse({ external: ["invalid name with spaces"] }),
		).toThrow();
		expect(() =>
			fotConfigSchema.parse({ external: ["UPPERCASE"] }),
		).toThrow();
		expect(() => fotConfigSchema.parse({ external: [""] })).toThrow();
	});

	it("should accept plugins as string array", () => {
		const result = fotConfigSchema.parse({
			plugins: ["plugin-one", "plugin-two"],
		});
		expect(result.plugins).toEqual([
			{ name: "plugin-one", enabled: true },
			{ name: "plugin-two", enabled: true },
		]);
	});

	it("should accept plugins as config objects", () => {
		const result = fotConfigSchema.parse({
			plugins: [
				{ name: "plugin-one", enabled: true },
				{ name: "plugin-two", enabled: false },
			],
		});
		expect(result.plugins).toEqual([
			{ name: "plugin-one", enabled: true },
			{ name: "plugin-two", enabled: false },
		]);
	});

	it("should accept valid formats", () => {
		const result = fotConfigSchema.parse({
			formats: ["esm", "cjs"],
		});
		expect(result.formats).toEqual(["esm", "cjs"]);
	});

	it("should reject invalid formats", () => {
		expect(() => fotConfigSchema.parse({ formats: ["invalid"] })).toThrow();
		expect(() => fotConfigSchema.parse({ formats: ["esm", "umd"] })).toThrow();
	});
});
