import { createPlugin } from "../plugin-base";
import type { DateTimeClass } from "../../types";
import type { DateTime } from "../../core/datetime";

/**
 * Checks if a given day of week is a weekday (Monday-Friday)
 * @param dayOfWeek - Day of week (0=Sunday, 6=Saturday)
 * @returns true if weekday, false otherwise
 */
function isWeekdayDay(dayOfWeek: number): boolean {
   return dayOfWeek >= 1 && dayOfWeek <= 5;
}

/**
 * Extended DateTime interface with business days methods
 */
declare module "../../core/datetime" {
   interface DateTime {
      /**
       * Checks if this date is a weekday (Monday-Friday)
       * @returns true if weekday, false otherwise
       */
      isWeekday(): boolean;

      /**
       * Checks if this date is a weekend (Saturday-Sunday)
       * @returns true if weekend, false otherwise
       */
      isWeekend(): boolean;

      /**
       * Adds business days to this date
       * Skips weekends (Saturday and Sunday)
       * @param n - Number of business days to add
       * @returns New DateTime instance with business days added
       */
      addBusinessDays(n: number): DateTime;

      /**
       * Subtracts business days from this date
       * Skips weekends (Saturday and Sunday)
       * @param n - Number of business days to subtract
       * @returns New DateTime instance with business days subtracted
       */
      subtractBusinessDays(n: number): DateTime;

      /**
       * Calculates the number of business days between this date and another
       * Excludes weekends from the calculation
       * @param other - DateTime instance to compare against
       * @returns Number of business days (positive if other is after, negative if before)
       */
      diffBusinessDays(other: DateTime): number;
   }
}

/**
 * Business Days plugin for DateTime
 * Adds methods for working with business days (weekdays only)
 * Week is defined as Monday-Friday (weekdays), Saturday-Sunday (weekend)
 */
export const businessDaysPlugin = createPlugin(
   "business-days",
   (DateTimeClass: DateTimeClass) => {
      // Add instance methods
      DateTimeClass.prototype.isWeekday = function (): boolean {
         const dayOfWeek = this.day(); // 0=Sunday, 6=Saturday
         return isWeekdayDay(dayOfWeek);
      };

      DateTimeClass.prototype.isWeekend = function (): boolean {
         const dayOfWeek = this.day();
         return dayOfWeek === 0 || dayOfWeek === 6;
      };

      DateTimeClass.prototype.addBusinessDays = function (n: number): DateTime {
         if (n === 0) {
            return this;
         }

         let current = new DateTimeClass(this.valueOf());
         let daysToAdd = Math.abs(n);
         const direction = n > 0 ? 1 : -1;

         while (daysToAdd > 0) {
            // Move one day in the specified direction
            current = current.addDays(direction);

            // Only count weekdays
            if ((current as any).isWeekday()) {
               daysToAdd--;
            }
         }

         return current;
      };

      DateTimeClass.prototype.subtractBusinessDays = function (n: number): DateTime {
         return (this as any).addBusinessDays(-n);
      };

      DateTimeClass.prototype.diffBusinessDays = function (other: DateTime): number {
         // Get start and end dates (normalized to start of day for consistency)
         const start = this.valueOf() < other.valueOf() ? this : other;
         const end = this.valueOf() < other.valueOf() ? other : this;
         const isReversed = this.valueOf() > other.valueOf();

         let businessDays = 0;
         let current = new DateTimeClass(start.valueOf());

         // Iterate through each day and count weekdays
         while (current.startOfDay().valueOf() < end.startOfDay().valueOf()) {
            if ((current as any).isWeekday()) {
               businessDays++;
            }
            current = current.addDays(1);
         }

         return isReversed ? -businessDays : businessDays;
      };
   },
);
