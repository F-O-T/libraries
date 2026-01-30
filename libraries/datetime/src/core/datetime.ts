import { InvalidDateError, PluginError } from "../errors";
import { DateInputSchema } from "../schemas";
import type { DateInput, DateTimePlugin } from "../types";

/**
 * Core DateTime class that wraps the native JavaScript Date object
 * Provides immutable operations and extensibility through plugins
 */
export class DateTime {
   /**
    * Internal date storage
    * @private
    */
   private readonly _date: Date;

   /**
    * Static registry of installed plugins
    * @private
    */
   private static readonly plugins: Map<string, DateTimePlugin> = new Map();

   /**
    * Creates a new DateTime instance
    * @param input - Date input (Date, ISO string, timestamp, DateTime, or undefined for current time)
    * @throws {InvalidDateError} When input fails Zod validation
    */
   constructor(input?: DateInput) {
      // If no input provided, use current time
      if (input === undefined) {
         this._date = new Date();
         return;
      }

      // Special handling for NaN - allow it but create invalid date
      if (typeof input === "number" && Number.isNaN(input)) {
         this._date = new Date(NaN);
         return;
      }

      // Special handling for Invalid Date objects - allow them through
      if (input instanceof Date && Number.isNaN(input.getTime())) {
         this._date = new Date(input.getTime());
         return;
      }

      // Validate input with Zod schema
      const validation = DateInputSchema.safeParse(input);
      if (!validation.success) {
         throw new InvalidDateError(
            `Invalid date input: ${validation.error.message}`,
            input,
         );
      }

      // Convert input to Date
      if (input instanceof Date) {
         // Clone the date to ensure immutability
         this._date = new Date(input.getTime());
      } else if (typeof input === "string") {
         // Parse ISO string or other date string
         // This may result in an Invalid Date, which is allowed
         this._date = new Date(input);
      } else if (typeof input === "number") {
         // Use timestamp
         this._date = new Date(input);
      } else if (this.isDateTimeInstance(input)) {
         // Clone from another DateTime instance
         this._date = new Date(input.valueOf());
      } else {
         // Should never reach here due to Zod validation, but TypeScript needs it
         throw new InvalidDateError("Unsupported date input type", input);
      }
   }

   /**
    * Type guard to check if value is a DateTime instance
    * @private
    */
   private isDateTimeInstance(val: unknown): val is DateTime {
      return (
         val !== null &&
         typeof val === "object" &&
         "toDate" in val &&
         typeof val.toDate === "function"
      );
   }

   /**
    * Checks if the date is valid
    * @returns true if the date is valid, false otherwise
    */
   public isValid(): boolean {
      return !Number.isNaN(this._date.getTime());
   }

   /**
    * Returns the native JavaScript Date object (cloned for immutability)
    * @returns A clone of the internal Date object
    */
   public toDate(): Date {
      return new Date(this._date.getTime());
   }

   /**
    * Returns ISO 8601 string representation
    * @returns ISO 8601 formatted string
    */
   public toISO(): string {
      return this._date.toISOString();
   }

   /**
    * Returns the Unix timestamp in milliseconds
    * @returns Unix timestamp
    */
   public valueOf(): number {
      return this._date.getTime();
   }

   // ============================================
   // Arithmetic Methods
   // ============================================

   /**
    * Adds milliseconds to the date
    * @param amount - Number of milliseconds to add (can be negative)
    * @returns New DateTime instance with added milliseconds
    */
   public addMilliseconds(amount: number): DateTime {
      return new DateTime(this.valueOf() + amount);
   }

   /**
    * Adds seconds to the date
    * @param amount - Number of seconds to add (can be negative)
    * @returns New DateTime instance with added seconds
    */
   public addSeconds(amount: number): DateTime {
      return this.addMilliseconds(amount * 1000);
   }

   /**
    * Adds minutes to the date
    * @param amount - Number of minutes to add (can be negative)
    * @returns New DateTime instance with added minutes
    */
   public addMinutes(amount: number): DateTime {
      return this.addMilliseconds(amount * 60 * 1000);
   }

   /**
    * Adds hours to the date
    * @param amount - Number of hours to add (can be negative)
    * @returns New DateTime instance with added hours
    */
   public addHours(amount: number): DateTime {
      return this.addMilliseconds(amount * 60 * 60 * 1000);
   }

   /**
    * Adds days to the date
    * @param amount - Number of days to add (can be negative)
    * @returns New DateTime instance with added days
    */
   public addDays(amount: number): DateTime {
      const newDate = this.toDate();
      newDate.setDate(newDate.getDate() + amount);
      return new DateTime(newDate);
   }

   /**
    * Adds weeks to the date
    * @param amount - Number of weeks to add (can be negative)
    * @returns New DateTime instance with added weeks
    */
   public addWeeks(amount: number): DateTime {
      return this.addDays(amount * 7);
   }

   /**
    * Adds months to the date
    * @param amount - Number of months to add (can be negative)
    * @returns New DateTime instance with added months
    */
   public addMonths(amount: number): DateTime {
      const newDate = this.toDate();
      newDate.setMonth(newDate.getMonth() + amount);
      return new DateTime(newDate);
   }

   /**
    * Adds years to the date
    * @param amount - Number of years to add (can be negative)
    * @returns New DateTime instance with added years
    */
   public addYears(amount: number): DateTime {
      const newDate = this.toDate();
      newDate.setFullYear(newDate.getFullYear() + amount);
      return new DateTime(newDate);
   }

   /**
    * Subtracts milliseconds from the date
    * @param amount - Number of milliseconds to subtract (can be negative)
    * @returns New DateTime instance with subtracted milliseconds
    */
   public subtractMilliseconds(amount: number): DateTime {
      return this.addMilliseconds(-amount);
   }

   /**
    * Subtracts seconds from the date
    * @param amount - Number of seconds to subtract (can be negative)
    * @returns New DateTime instance with subtracted seconds
    */
   public subtractSeconds(amount: number): DateTime {
      return this.addSeconds(-amount);
   }

   /**
    * Subtracts minutes from the date
    * @param amount - Number of minutes to subtract (can be negative)
    * @returns New DateTime instance with subtracted minutes
    */
   public subtractMinutes(amount: number): DateTime {
      return this.addMinutes(-amount);
   }

   /**
    * Subtracts hours from the date
    * @param amount - Number of hours to subtract (can be negative)
    * @returns New DateTime instance with subtracted hours
    */
   public subtractHours(amount: number): DateTime {
      return this.addHours(-amount);
   }

   /**
    * Subtracts days from the date
    * @param amount - Number of days to subtract (can be negative)
    * @returns New DateTime instance with subtracted days
    */
   public subtractDays(amount: number): DateTime {
      return this.addDays(-amount);
   }

   /**
    * Subtracts weeks from the date
    * @param amount - Number of weeks to subtract (can be negative)
    * @returns New DateTime instance with subtracted weeks
    */
   public subtractWeeks(amount: number): DateTime {
      return this.addWeeks(-amount);
   }

   /**
    * Subtracts months from the date
    * @param amount - Number of months to subtract (can be negative)
    * @returns New DateTime instance with subtracted months
    */
   public subtractMonths(amount: number): DateTime {
      return this.addMonths(-amount);
   }

   /**
    * Subtracts years from the date
    * @param amount - Number of years to subtract (can be negative)
    * @returns New DateTime instance with subtracted years
    */
   public subtractYears(amount: number): DateTime {
      return this.addYears(-amount);
   }

   // ============================================
   // Comparison Methods
   // ============================================

   /**
    * Checks if this date is before another date
    * @param other - DateTime instance to compare against
    * @returns true if this date is before the other date, false otherwise
    */
   public isBefore(other: DateTime): boolean {
      return this.valueOf() < other.valueOf();
   }

   /**
    * Checks if this date is after another date
    * @param other - DateTime instance to compare against
    * @returns true if this date is after the other date, false otherwise
    */
   public isAfter(other: DateTime): boolean {
      return this.valueOf() > other.valueOf();
   }

   /**
    * Checks if this date is the same as another date
    * @param other - DateTime instance to compare against
    * @returns true if this date is the same as the other date, false otherwise
    */
   public isSame(other: DateTime): boolean {
      return this.valueOf() === other.valueOf();
   }

   /**
    * Checks if this date is the same as or before another date
    * @param other - DateTime instance to compare against
    * @returns true if this date is the same as or before the other date, false otherwise
    */
   public isSameOrBefore(other: DateTime): boolean {
      return this.valueOf() <= other.valueOf();
   }

   /**
    * Checks if this date is the same as or after another date
    * @param other - DateTime instance to compare against
    * @returns true if this date is the same as or after the other date, false otherwise
    */
   public isSameOrAfter(other: DateTime): boolean {
      return this.valueOf() >= other.valueOf();
   }

   /**
    * Checks if this date is between two dates
    * @param start - Start date of the range
    * @param end - End date of the range
    * @param inclusive - Whether to include the start and end dates in the comparison (default: false)
    * @returns true if this date is between start and end, false otherwise
    */
   public isBetween(start: DateTime, end: DateTime, inclusive = false): boolean {
      const thisTime = this.valueOf();
      const startTime = start.valueOf();
      const endTime = end.valueOf();

      if (inclusive) {
         return thisTime >= startTime && thisTime <= endTime;
      }
      return thisTime > startTime && thisTime < endTime;
   }

   /**
    * Registers a plugin to extend DateTime functionality
    * @param plugin - The plugin to register
    * @param options - Optional plugin configuration
    * @throws {PluginError} When plugin with same name already exists
    */
   public static extend(
      plugin: DateTimePlugin,
      options?: Record<string, unknown>,
   ): void {
      // Check if plugin already registered
      if (DateTime.plugins.has(plugin.name)) {
         throw new PluginError(
            `Plugin ${plugin.name} is already registered`,
            plugin.name,
         );
      }

      // Register plugin
      DateTime.plugins.set(plugin.name, plugin);

      // Call plugin install function
      plugin.install(DateTime as any, options);
   }

   /**
    * Checks if a plugin is registered
    * @param name - Plugin name
    * @returns true if plugin is registered, false otherwise
    */
   public static hasPlugin(name: string): boolean {
      return DateTime.plugins.has(name);
   }

   /**
    * Gets a registered plugin
    * @param name - Plugin name
    * @returns The plugin if found, undefined otherwise
    */
   public static getPlugin(name: string): DateTimePlugin | undefined {
      return DateTime.plugins.get(name);
   }
}
