import { z } from "zod";
import type { DateTime } from "./types";

/**
 * Schema for time units
 */
export const TimeUnitSchema = z.enum([
   "millisecond",
   "second",
   "minute",
   "hour",
   "day",
   "week",
   "month",
   "year",
]);

/**
 * Schema for DateTime input types
 * Accepts Date, string, number, or DateTime instance
 */
export const DateInputSchema = z.union([
   z.date(),
   z.string(),
   z.number(),
   z.custom<DateTime>(
      (val) =>
         val !== null &&
         typeof val === "object" &&
         "toDate" in val &&
         typeof val.toDate === "function",
      {
         message: "Expected DateTime instance",
      },
   ),
]);

/**
 * Schema for DateTime configuration
 */
export const DateTimeConfigSchema = z.object({
   timezone: z.string().optional(),
   locale: z.string().optional(),
   utc: z.boolean().optional(),
   strict: z.boolean().optional(),
});

/**
 * Schema for format options
 */
export const FormatOptionsSchema = z.object({
   locale: z.string().optional(),
   timezone: z.string().optional(),
});

/**
 * Schema for parse options
 */
export const ParseOptionsSchema = z.object({
   strict: z.boolean().optional(),
   format: z.string().optional(),
   timezone: z.string().optional(),
});

/**
 * Schema for ISO 8601 date strings (full datetime with timezone)
 * Matches: YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ss.sss±HH:mm
 */
export const ISODateSchema = z
   .string()
   .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/,
      {
         message:
            "Invalid ISO 8601 datetime format. Expected: YYYY-MM-DDTHH:mm:ss.sssZ",
      },
   );

/**
 * Schema for ISO 8601 date-only strings
 * Matches: YYYY-MM-DD
 */
export const ISODateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
   message: "Invalid ISO 8601 date format. Expected: YYYY-MM-DD",
});

/**
 * Schema for ISO 8601 time-only strings
 * Matches: HH:mm:ss or HH:mm:ss.sss
 */
export const ISOTimeOnlySchema = z
   .string()
   .regex(/^\d{2}:\d{2}:\d{2}(\.\d{1,3})?$/, {
      message:
         "Invalid ISO 8601 time format. Expected: HH:mm:ss or HH:mm:ss.sss",
   });

/**
 * Schema for plugin definition
 */
export const DateTimePluginSchema = z.object({
   name: z.string().min(1, "Plugin name cannot be empty"),
   install: z.function(),
});
