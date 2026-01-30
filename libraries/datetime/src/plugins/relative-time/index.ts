import type { DateTime } from "../../core/datetime";
import type { DateTimeClass } from "../../types";
import { createPlugin } from "../plugin-base";

/**
 * Time thresholds for relative time formatting (in seconds)
 */
const THRESHOLDS = {
   second: 45, // 0-45 seconds
   minute: 90, // 45-90 seconds
   hour: 2700, // 45 minutes - 1.5 hours
   day: 75600, // 21 hours threshold for switching to days
   month: 2592000, // ~30 days
   year: 31536000, // ~365 days
};

/**
 * Formats a relative time string
 * @param diff - Time difference in seconds
 * @param isPast - Whether the time is in the past
 * @returns Human-readable relative time string
 */
function formatRelativeTime(diff: number, isPast: boolean): string {
   const absDiff = Math.abs(diff);

   // Handle zero difference
   if (absDiff === 0 || absDiff < THRESHOLDS.second) {
      return isPast || diff === 0 ? "a few seconds ago" : "in a few seconds";
   } else if (absDiff < THRESHOLDS.minute) {
      return isPast ? "a minute ago" : "in a minute";
   } else if (absDiff < THRESHOLDS.hour) {
      const value = Math.round(absDiff / 60);
      const unit = value === 1 ? "minute" : "minutes";
      return isPast ? `${value} ${unit} ago` : `in ${value} ${unit}`;
   } else if (absDiff < THRESHOLDS.day) {
      const value = Math.round(absDiff / 3600);
      if (value === 1) {
         return isPast ? "an hour ago" : "in an hour";
      }
      const unit = "hours";
      return isPast ? `${value} ${unit} ago` : `in ${value} ${unit}`;
   } else if (absDiff < THRESHOLDS.month) {
      const value = Math.round(absDiff / 86400);
      if (value === 1) {
         return isPast ? "a day ago" : "in a day";
      }
      const unit = "days";
      return isPast ? `${value} ${unit} ago` : `in ${value} ${unit}`;
   } else if (absDiff < THRESHOLDS.year) {
      const value = Math.round(absDiff / 2592000);
      if (value === 1) {
         return isPast ? "a month ago" : "in a month";
      }
      const unit = "months";
      return isPast ? `${value} ${unit} ago` : `in ${value} ${unit}`;
   } else {
      const value = Math.round(absDiff / 31536000);
      if (value === 1) {
         return isPast ? "a year ago" : "in a year";
      }
      const unit = "years";
      return isPast ? `${value} ${unit} ago` : `in ${value} ${unit}`;
   }
}

/**
 * Extended DateTime interface with relative time methods
 */
declare module "../../core/datetime" {
   interface DateTime {
      /**
       * Returns a human-readable string representing the time from now
       * @returns Relative time string (e.g., "2 hours ago", "in 3 days")
       *
       * @example
       * ```ts
       * dt.fromNow() // "2 hours ago"
       * dt.fromNow() // "in 3 days"
       * ```
       */
      fromNow(): string;

      /**
       * Returns a human-readable string representing the time to now
       * Opposite of fromNow()
       * @returns Relative time string
       *
       * @example
       * ```ts
       * dt.toNow() // "in 2 hours"
       * dt.toNow() // "3 days ago"
       * ```
       */
      toNow(): string;

      /**
       * Returns a human-readable string representing the time from another DateTime
       * @param other - DateTime instance to compare against
       * @returns Relative time string
       *
       * @example
       * ```ts
       * dt1.from(dt2) // "2 hours ago"
       * dt1.from(dt2) // "in 3 days"
       * ```
       */
      from(other: DateTime): string;

      /**
       * Returns a human-readable string representing the time to another DateTime
       * Opposite of from()
       * @param other - DateTime instance to compare against
       * @returns Relative time string
       *
       * @example
       * ```ts
       * dt1.to(dt2) // "in 2 hours"
       * dt1.to(dt2) // "3 days ago"
       * ```
       */
      to(other: DateTime): string;
   }
}

/**
 * Relative Time plugin for DateTime
 * Adds methods for human-readable relative time formatting
 */
export const relativeTimePlugin = createPlugin(
   "relative-time",
   (DateTimeClass: DateTimeClass) => {
      // Add instance methods
      DateTimeClass.prototype.fromNow = function (): string {
         const now = new DateTimeClass();
         const diffMs = this.valueOf() - now.valueOf();
         const diffSeconds = diffMs / 1000;
         const isPast = diffSeconds < 0;

         return formatRelativeTime(diffSeconds, isPast);
      };

      DateTimeClass.prototype.toNow = function (): string {
         const now = new DateTimeClass();
         const diffMs = this.valueOf() - now.valueOf();
         const diffSeconds = diffMs / 1000;
         const isPast = diffSeconds < 0;

         // Reverse the direction for toNow
         return formatRelativeTime(diffSeconds, !isPast);
      };

      DateTimeClass.prototype.from = function (other: DateTime): string {
         const diffMs = this.valueOf() - other.valueOf();
         const diffSeconds = diffMs / 1000;
         const isPast = diffSeconds < 0;

         return formatRelativeTime(diffSeconds, isPast);
      };

      DateTimeClass.prototype.to = function (other: DateTime): string {
         const diffMs = this.valueOf() - other.valueOf();
         const diffSeconds = diffMs / 1000;
         const isPast = diffSeconds < 0;

         // Reverse the direction for to
         return formatRelativeTime(diffSeconds, !isPast);
      };
   },
);
