import type { ResolvedFotConfig } from "../types";

/**
 * Biome configuration structure
 */
export interface BiomeConfig {
	$schema: string;
	vcs: {
		enabled: boolean;
		clientKind: string;
		useIgnoreFile: boolean;
		defaultBranch: string;
	};
	files: {
		ignoreUnknown: boolean;
		ignore: string[];
	};
	formatter: {
		enabled: boolean;
		indentStyle: string;
		indentWidth: number;
		lineWidth: number;
	};
	organizeImports: {
		enabled: boolean;
	};
	linter: {
		enabled: boolean;
		rules: {
			recommended: boolean;
		};
	};
	javascript: {
		formatter: {
			quoteStyle: string;
			semicolons: string;
			trailingCommas: string;
		};
	};
}

/**
 * Generate a biome.json file from a resolved FOT configuration
 *
 * @param config - The resolved FOT configuration
 * @returns The generated biome.json object
 */
export function generateBiomeConfig(config: ResolvedFotConfig): BiomeConfig {
	return {
		$schema: "https://biomejs.dev/schemas/1.9.4/schema.json",
		vcs: {
			enabled: true,
			clientKind: "git",
			useIgnoreFile: true,
			defaultBranch: "main",
		},
		files: {
			ignoreUnknown: false,
			ignore: ["node_modules", "dist", "*.config.ts"],
		},
		formatter: {
			enabled: config.biome.enabled,
			indentStyle: "tab",
			indentWidth: 2,
			lineWidth: 80,
		},
		organizeImports: {
			enabled: true,
		},
		linter: {
			enabled: config.biome.enabled,
			rules: {
				recommended: true,
			},
		},
		javascript: {
			formatter: {
				quoteStyle: "double",
				semicolons: "always",
				trailingCommas: "all",
			},
		},
	};
}
