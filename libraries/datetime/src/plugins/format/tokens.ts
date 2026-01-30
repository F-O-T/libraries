import type { DateTime } from "../../core/datetime";

/**
 * Pads a number with leading zeros
 */
function pad(num: number, length: number): string {
   return num.toString().padStart(length, "0");
}

/**
 * Month names (full)
 */
const MONTH_NAMES = [
   "January",
   "February",
   "March",
   "April",
   "May",
   "June",
   "July",
   "August",
   "September",
   "October",
   "November",
   "December",
];

/**
 * Month names (abbreviated)
 */
const MONTH_NAMES_SHORT = [
   "Jan",
   "Feb",
   "Mar",
   "Apr",
   "May",
   "Jun",
   "Jul",
   "Aug",
   "Sep",
   "Oct",
   "Nov",
   "Dec",
];

/**
 * Day of week names (full)
 */
const DAY_NAMES = [
   "Sunday",
   "Monday",
   "Tuesday",
   "Wednesday",
   "Thursday",
   "Friday",
   "Saturday",
];

/**
 * Day of week names (abbreviated)
 */
const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Day of week names (two letters)
 */
const DAY_NAMES_MIN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Format token definitions
 * Maps token strings to functions that extract the value from a DateTime instance
 */
export const FORMAT_TOKENS: Record<string, (dt: DateTime) => string> = {
   // Year
   YYYY: (dt) => dt.year().toString(),
   YY: (dt) => pad(dt.year() % 100, 2),

   // Month
   MMMM: (dt) => MONTH_NAMES[dt.month()]!,
   MMM: (dt) => MONTH_NAMES_SHORT[dt.month()]!,
   MM: (dt) => pad(dt.month() + 1, 2),
   M: (dt) => (dt.month() + 1).toString(),

   // Day of Month
   DD: (dt) => pad(dt.date(), 2),
   D: (dt) => dt.date().toString(),

   // Day of Week
   dddd: (dt) => DAY_NAMES[dt.day()]!,
   ddd: (dt) => DAY_NAMES_SHORT[dt.day()]!,
   dd: (dt) => DAY_NAMES_MIN[dt.day()]!,

   // Hour (24-hour)
   HH: (dt) => pad(dt.hour(), 2),
   H: (dt) => dt.hour().toString(),

   // Hour (12-hour)
   hh: (dt) => {
      const hour = dt.hour();
      const hour12 = hour % 12 || 12;
      return pad(hour12, 2);
   },
   h: (dt) => {
      const hour = dt.hour();
      const hour12 = hour % 12 || 12;
      return hour12.toString();
   },

   // Minute
   mm: (dt) => pad(dt.minute(), 2),
   m: (dt) => dt.minute().toString(),

   // Second
   ss: (dt) => pad(dt.second(), 2),
   s: (dt) => dt.second().toString(),

   // Millisecond
   SSS: (dt) => pad(dt.millisecond(), 3),

   // AM/PM
   A: (dt) => (dt.hour() >= 12 ? "PM" : "AM"),
   a: (dt) => (dt.hour() >= 12 ? "pm" : "am"),

   // Day of week number
   d: (dt) => dt.day().toString(),
};

/**
 * Regular expression to match format tokens
 * Matches escaped text first, then longest tokens to avoid partial matches
 * Order is critical: longer tokens must come before shorter ones
 */
export const TOKEN_REGEX =
   /\[([^\]]+)\]|YYYY|MMMM|MMM|MM|M|dddd|ddd|DD|dd|D|d|HH|hh|H|h|mm|m|ss|s|SSS|YY|A|a/g;

/**
 * Parses a format string and replaces tokens with actual values
 * @param dt - DateTime instance
 * @param formatStr - Format string with tokens
 * @returns Formatted date string
 */
export function parseFormat(dt: DateTime, formatStr: string): string {
   return formatStr.replace(TOKEN_REGEX, (match, escapedText) => {
      // If it's escaped text in brackets, return without brackets
      if (escapedText !== undefined) {
         return escapedText;
      }

      // Otherwise, look up the token and apply it
      const tokenFn = FORMAT_TOKENS[match];
      return tokenFn ? tokenFn(dt) : match;
   });
}
