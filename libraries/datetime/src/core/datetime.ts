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
