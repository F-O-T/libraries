import { describe, expect, it } from "bun:test";
import type { ResolvedFotConfig } from "../../src/types";
import { generateBiomeConfig } from "../../src/generators/biome";

describe("generateBiomeConfig", () => {
	const baseConfig: ResolvedFotConfig = {
		formats: ["esm"],
		external: [],
		typescript: { declaration: true, isolatedDeclarations: false },
		biome: { enabled: true },
		plugins: [],
	};

	it("should generate valid biome config structure", () => {
		const biome = generateBiomeConfig(baseConfig);

		expect(biome.$schema).toBeString();
		expect(biome.vcs.enabled).toBe(true);
		expect(biome.vcs.clientKind).toBe("git");
		expect(biome.files.ignore).toContain("node_modules");
		expect(biome.files.ignore).toContain("dist");
	});

	it("should enable formatter and linter when biome is enabled", () => {
		const biome = generateBiomeConfig(baseConfig);

		expect(biome.formatter.enabled).toBe(true);
		expect(biome.linter.enabled).toBe(true);
	});

	it("should disable formatter and linter when biome is disabled", () => {
		const config: ResolvedFotConfig = {
			...baseConfig,
			biome: { enabled: false },
		};
		const biome = generateBiomeConfig(config);

		expect(biome.formatter.enabled).toBe(false);
		expect(biome.linter.enabled).toBe(false);
	});

	it("should use tab indentation", () => {
		const biome = generateBiomeConfig(baseConfig);

		expect(biome.formatter.indentStyle).toBe("tab");
	});

	it("should use double quotes and semicolons", () => {
		const biome = generateBiomeConfig(baseConfig);

		expect(biome.javascript.formatter.quoteStyle).toBe("double");
		expect(biome.javascript.formatter.semicolons).toBe("always");
	});
});
