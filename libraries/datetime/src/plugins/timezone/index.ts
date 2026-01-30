import { createPlugin } from "../plugin-base";
import type { DateTimeClass } from "../../types";
import type { DateTime } from "../../core/datetime";

/**
 * Validates a timezone string using Intl.DateTimeFormat
 * @param timezone - IANA timezone string to validate
 * @returns true if valid, false otherwise
 */
function isValidTimezone(timezone: string): boolean {
   if (!timezone || typeof timezone !== "string") {
      return false;
   }

   try {
      // Use Intl.DateTimeFormat to validate timezone
      new Intl.DateTimeFormat("en-US", { timeZone: timezone });
      return true;
   } catch {
      return false;
   }
}

/**
 * Gets the system's local timezone
 * @returns IANA timezone string for local timezone
 */
function getLocalTimezone(): string {
   return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Extended DateTime interface with timezone methods
 */
declare module "../../core/datetime" {
   interface DateTime {
      /**
       * Sets the timezone for this DateTime instance
       * @param timezone - IANA timezone string (e.g., "America/New_York")
       * @returns New DateTime instance with timezone set
       */
      tz(timezone: string): DateTime;

      /**
       * Converts this DateTime to a different timezone
       * @param timezone - IANA timezone string
       * @returns New DateTime instance in the specified timezone
       */
      toTimezone(timezone: string): DateTime;

      /**
       * Converts this DateTime to UTC timezone
       * @returns New DateTime instance in UTC
       */
      utc(): DateTime;

      /**
       * Converts this DateTime to local system timezone
       * @returns New DateTime instance in local timezone
       */
      local(): DateTime;

      /**
       * Gets the current timezone of this DateTime instance
       * @returns IANA timezone string
       */
      getTimezone(): string;

      /**
       * Internal timezone storage
       * @private
       */
      _timezone?: string;
   }
}

/**
 * Extended DateTimeClass interface with static timezone method
 */
declare module "../../types" {
   interface DateTimeClass {
      /**
       * Creates a DateTime instance in a specific timezone
       * @param input - Date input
       * @param timezone - IANA timezone string
       * @returns DateTime instance in the specified timezone
       */
      tz(input: any, timezone: string): DateTime;
   }
}

/**
 * Timezone plugin for DateTime
 * Adds timezone support using IANA timezone strings
 */
export const timezonePlugin = createPlugin("timezone", (DateTimeClass: DateTimeClass) => {
   // Add instance methods
   DateTimeClass.prototype.tz = function (timezone: string): DateTime {
      if (!isValidTimezone(timezone)) {
         throw new Error(`Invalid timezone: ${timezone}`);
      }

      // Create new instance with same timestamp but different timezone
      const newInstance = new DateTimeClass(this.valueOf());
      (newInstance as any)._timezone = timezone;
      return newInstance;
   };

   DateTimeClass.prototype.toTimezone = function (timezone: string): DateTime {
      if (!isValidTimezone(timezone)) {
         throw new Error(`Invalid timezone: ${timezone}`);
      }

      // Convert to the new timezone (same as tz for now, as we preserve moment in time)
      const newInstance = new DateTimeClass(this.valueOf());
      (newInstance as any)._timezone = timezone;
      return newInstance;
   };

   DateTimeClass.prototype.utc = function (): DateTime {
      const newInstance = new DateTimeClass(this.valueOf());
      (newInstance as any)._timezone = "UTC";
      return newInstance;
   };

   DateTimeClass.prototype.local = function (): DateTime {
      const localTz = getLocalTimezone();
      const newInstance = new DateTimeClass(this.valueOf());
      (newInstance as any)._timezone = localTz;
      return newInstance;
   };

   DateTimeClass.prototype.getTimezone = function (): string {
      return (this as any)._timezone || "UTC";
   };

   // Add static method
   (DateTimeClass as any).tz = function (input: any, timezone: string): DateTime {
      if (!isValidTimezone(timezone)) {
         throw new Error(`Invalid timezone: ${timezone}`);
      }

      const instance = new DateTimeClass(input);
      (instance as any)._timezone = timezone;
      return instance;
   };
});
