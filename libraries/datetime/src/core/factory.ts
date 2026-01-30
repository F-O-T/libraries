import type { DateInput } from "../types.ts";
import { DateTime } from "./datetime.ts";

/**
 * Factory function to create a DateTime instance
 * Provides a convenient alternative to using the constructor
 *
 * @param input - Date input (Date, ISO string, timestamp, DateTime, or undefined for current time)
 * @returns A new DateTime instance
 * @throws {InvalidDateError} When input fails validation
 *
 * @example
 * ```ts
 * // Create with current time
 * const now = datetime();
 *
 * // Create from Date object
 * const dt1 = datetime(new Date());
 *
 * // Create from ISO string
 * const dt2 = datetime("2024-01-15T10:30:00Z");
 *
 * // Create from timestamp
 * const dt3 = datetime(1705315800000);
 *
 * // Create from another DateTime
 * const dt4 = datetime(dt1);
 * ```
 */
export function datetime(input?: DateInput): DateTime {
   return new DateTime(input);
}
