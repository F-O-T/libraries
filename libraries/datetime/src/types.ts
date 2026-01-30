import type { z } from "zod";

/**
 * Time units supported by the library
 */
export type TimeUnit =
	| "millisecond"
	| "second"
	| "minute"
	| "hour"
	| "day"
	| "week"
	| "month"
	| "year";

/**
 * Input types that can be converted to DateTime
 */
export type DateInput = Date | string | number | DateTime;

/**
 * Plugin definition
 */
export interface DateTimePlugin {
	/**
	 * Plugin name (must be unique)
	 */
	name: string;

	/**
	 * Install function that extends the DateTime class
	 * @param DateTimeClass - The DateTime class to extend
	 * @param options - Optional plugin configuration
	 */
	install: (
		DateTimeClass: DateTimeClass,
		options?: Record<string, unknown>,
	) => void;
}

/**
 * Configuration options for DateTime instance creation
 */
export interface DateTimeConfig {
	/**
	 * Timezone (IANA timezone string, e.g., "America/New_York")
	 * Defaults to system timezone
	 */
	timezone?: string;

	/**
	 * Locale for formatting (BCP 47 language tag, e.g., "en-US")
	 * Defaults to system locale
	 */
	locale?: string;

	/**
	 * Whether to use UTC mode
	 * @default false
	 */
	utc?: boolean;

	/**
	 * Whether parsing should be strict
	 * @default true
	 */
	strict?: boolean;
}

/**
 * Options for formatting dates
 */
export interface FormatOptions {
	/**
	 * Locale for formatting (BCP 47 language tag)
	 */
	locale?: string;

	/**
	 * Timezone for formatting (IANA timezone string)
	 */
	timezone?: string;
}

/**
 * Options for parsing dates
 */
export interface ParseOptions {
	/**
	 * Whether to use strict parsing
	 * @default true
	 */
	strict?: boolean;

	/**
	 * Expected format string
	 */
	format?: string;

	/**
	 * Timezone to parse in (IANA timezone string)
	 */
	timezone?: string;
}

/**
 * DateTime class type (used for plugin typing)
 */
export interface DateTimeClass {
	new (input?: DateInput, config?: DateTimeConfig): DateTime;
	prototype: DateTime;
	extend: (plugin: DateTimePlugin, options?: Record<string, unknown>) => void;
	utc: (input?: DateInput) => DateTime;
	tz: (input: DateInput | undefined, timezone: string) => DateTime;
}

/**
 * Main DateTime instance interface
 * This will be implemented by the DateTime class
 */
export interface DateTime {
	/**
	 * Returns the native JavaScript Date object
	 */
	toDate(): Date;

	/**
	 * Returns the Unix timestamp in milliseconds
	 */
	valueOf(): number;

	/**
	 * Returns ISO 8601 string representation
	 */
	toISOString(): string;

	/**
	 * Returns JSON representation (ISO string)
	 */
	toJSON(): string;

	/**
	 * Formats the date using a format string
	 */
	format(formatStr?: string): string;

	/**
	 * Checks if the date is valid
	 */
	isValid(): boolean;

	/**
	 * Checks if this date is before another date
	 */
	isBefore(date: DateInput, unit?: TimeUnit): boolean;

	/**
	 * Checks if this date is after another date
	 */
	isAfter(date: DateInput, unit?: TimeUnit): boolean;

	/**
	 * Checks if this date is the same as another date
	 */
	isSame(date: DateInput, unit?: TimeUnit): boolean;

	/**
	 * Gets a specific time unit value
	 */
	get(unit: TimeUnit): number;

	/**
	 * Sets a specific time unit value and returns a new instance
	 */
	set(unit: TimeUnit, value: number): DateTime;

	/**
	 * Adds time to the current date and returns a new instance
	 */
	add(value: number, unit: TimeUnit): DateTime;

	/**
	 * Subtracts time from the current date and returns a new instance
	 */
	subtract(value: number, unit: TimeUnit): DateTime;

	/**
	 * Returns the start of a time unit
	 */
	startOf(unit: TimeUnit): DateTime;

	/**
	 * Returns the end of a time unit
	 */
	endOf(unit: TimeUnit): DateTime;

	/**
	 * Clones the current instance
	 */
	clone(): DateTime;

	/**
	 * Returns the difference between two dates
	 */
	diff(date: DateInput, unit?: TimeUnit, precise?: boolean): number;
}

/**
 * Schema types derived from Zod schemas (will be defined in schemas.ts)
 */
export type TimeUnitSchema = z.ZodEnum<
	[
		"millisecond",
		"second",
		"minute",
		"hour",
		"day",
		"week",
		"month",
		"year",
	]
>;
export type DateInputSchema = z.ZodUnion<
	[
		z.ZodDate,
		z.ZodString,
		z.ZodNumber,
		z.ZodType<DateTime, z.ZodTypeDef, DateTime>,
	]
>;
export type DateTimeConfigSchema = z.ZodObject<{
	timezone: z.ZodOptional<z.ZodString>;
	locale: z.ZodOptional<z.ZodString>;
	utc: z.ZodOptional<z.ZodBoolean>;
	strict: z.ZodOptional<z.ZodBoolean>;
}>;
export type FormatOptionsSchema = z.ZodObject<{
	locale: z.ZodOptional<z.ZodString>;
	timezone: z.ZodOptional<z.ZodString>;
}>;
export type ParseOptionsSchema = z.ZodObject<{
	strict: z.ZodOptional<z.ZodBoolean>;
	format: z.ZodOptional<z.ZodString>;
	timezone: z.ZodOptional<z.ZodString>;
}>;
