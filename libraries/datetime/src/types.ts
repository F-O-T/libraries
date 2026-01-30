import type { DateTime as DateTimeInstance } from "./core/datetime";
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
 * DateTime instance type - re-exported from the class
 */
export type DateTime = DateTimeInstance;

/**
 * Input types that can be converted to DateTime
 */
export type DateInput = Date | string | number | DateTime;

/**
 * DateTime class type (used for plugin typing)
 * Must be defined before DateTimePlugin to avoid forward reference
 */
export interface DateTimeClass {
   new (input?: DateInput): DateTime;
   prototype: DateTime;
   extend: (plugin: DateTimePlugin, options?: Record<string, unknown>) => void;
   hasPlugin: (name: string) => boolean;
   getPlugin: (name: string) => DateTimePlugin | undefined;
}

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
