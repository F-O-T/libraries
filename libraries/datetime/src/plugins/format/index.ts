import { createPlugin } from "../plugin-base";
import type { DateTimeClass } from "../../types";
import type { DateTime } from "../../core/datetime";
import { parseFormat } from "./tokens";

/**
 * Default format string
 */
const DEFAULT_FORMAT = "YYYY-MM-DDTHH:mm:ss.SSSZ";

/**
 * Extended DateTime interface with format method
 */
declare module "../../core/datetime" {
   interface DateTime {
      /**
       * Formats the date using a format string
       * @param formatStr - Format string with tokens (default: ISO format)
       * @returns Formatted date string
       *
       * @example
       * ```ts
       * dt.format("YYYY-MM-DD") // "2024-01-15"
       * dt.format("MM/DD/YYYY") // "01/15/2024"
       * dt.format("MMMM D, YYYY") // "January 15, 2024"
       * dt.format("h:mm A") // "2:30 PM"
       * dt.format("[Year:] YYYY") // "Year: 2024"
       * ```
       *
       * Available tokens:
       * - YYYY: 4-digit year
       * - YY: 2-digit year
       * - MMMM: Full month name
       * - MMM: Abbreviated month name
       * - MM: 2-digit month
       * - M: Month number
       * - DD: 2-digit day of month
       * - D: Day of month
       * - dddd: Full day name
       * - ddd: Abbreviated day name
       * - dd: Min day name
       * - d: Day of week (0-6)
       * - HH: 2-digit hour (24-hour)
       * - H: Hour (24-hour)
       * - hh: 2-digit hour (12-hour)
       * - h: Hour (12-hour)
       * - mm: 2-digit minute
       * - m: Minute
       * - ss: 2-digit second
       * - s: Second
       * - SSS: Millisecond
       * - A: AM/PM (uppercase)
       * - a: am/pm (lowercase)
       * - [text]: Escaped text (literal)
       */
      format(formatStr?: string): string;
   }
}

/**
 * Format plugin for DateTime
 * Adds format() method for custom date formatting
 */
export const formatPlugin = createPlugin("format", (DateTimeClass: DateTimeClass) => {
   // Add instance method
   DateTimeClass.prototype.format = function (formatStr?: string): string {
      // If no format string provided, return ISO string
      if (!formatStr) {
         return this.toISO();
      }

      // Parse the format string and replace tokens
      return parseFormat(this, formatStr);
   };
});
