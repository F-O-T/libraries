import { z } from "zod";

/**
 * Regex for validating npm package names (scoped and unscoped)
 * - Must be lowercase
 * - Can contain hyphens, dots, underscores
 * - Scoped packages: @scope/name
 * - Cannot start with dot or underscore
 */
const packageNameRegex =
	/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

/**
 * Schema for build output formats
 */
export const buildFormatSchema = z.enum(["esm", "cjs"]);

/**
 * Schema for plugin configuration
 * Accepts either a string (plugin name) or a config object
 */
export const pluginConfigSchema = z
	.union([
		z.string(),
		z.object({
			name: z.string(),
			enabled: z.boolean().default(true),
		}),
	])
	.transform((val) => {
		if (typeof val === "string") {
			return { name: val, enabled: true };
		}
		return { name: val.name, enabled: val.enabled ?? true };
	});

/**
 * Schema for TypeScript compiler options
 */
export const typeScriptOptionsSchema = z
	.object({
		declaration: z.boolean().default(true),
	})
	.default({ declaration: true });

/**
 * Schema for Biome configuration options
 */
export const biomeOptionsSchema = z
	.object({
		enabled: z.boolean().default(true),
	})
	.default({ enabled: true });

/**
 * Schema for FOT configuration
 */
export const fotConfigSchema = z.object({
	formats: z.array(buildFormatSchema).default(["esm"]),
	external: z
		.array(
			z.string().regex(packageNameRegex, {
				message: "Invalid package name format",
			}),
		)
		.default([]),
	typescript: typeScriptOptionsSchema,
	biome: biomeOptionsSchema,
	plugins: z.array(pluginConfigSchema).default([]),
});

/**
 * Type for input configuration (before validation and defaults)
 */
export type FotConfigInput = z.input<typeof fotConfigSchema>;

/**
 * Type for output configuration (after validation and defaults)
 */
export type FotConfigOutput = z.output<typeof fotConfigSchema>;
