import type { DateTimeClass, DateTimePlugin } from "../types.ts";

/**
 * Helper function to create a DateTime plugin
 *
 * @param name - Unique plugin name
 * @param install - Installation function that extends the DateTime class
 * @returns A DateTimePlugin object
 *
 * @example
 * ```ts
 * const myPlugin = createPlugin("myPlugin", (DateTimeClass, options) => {
 *   // Extend DateTime prototype
 *   DateTimeClass.prototype.myMethod = function() {
 *     return this.valueOf();
 *   };
 *
 *   // Add static methods
 *   DateTimeClass.myStaticMethod = function() {
 *     return new DateTimeClass();
 *   };
 * });
 *
 * // Register the plugin
 * DateTime.extend(myPlugin);
 * ```
 */
export function createPlugin(
   name: string,
   install: (
      DateTimeClass: DateTimeClass,
      options?: Record<string, unknown>,
   ) => void,
): DateTimePlugin {
   if (!name || typeof name !== "string") {
      throw new Error("Plugin name must be a non-empty string");
   }

   if (typeof install !== "function") {
      throw new Error("Plugin install must be a function");
   }

   return {
      name,
      install,
   };
}

/**
 * Type guard to check if an object is a valid DateTimePlugin
 *
 * @param obj - Object to check
 * @returns true if object is a valid DateTimePlugin
 */
export function isPlugin(obj: unknown): obj is DateTimePlugin {
   if (!obj || typeof obj !== "object") {
      return false;
   }

   const plugin = obj as Partial<DateTimePlugin>;

   return (
      typeof plugin.name === "string" &&
      plugin.name.length > 0 &&
      typeof plugin.install === "function"
   );
}

/**
 * Validates that a plugin name follows naming conventions
 *
 * @param name - Plugin name to validate
 * @returns true if name is valid, false otherwise
 *
 * @remarks
 * Valid plugin names:
 * - Must be a non-empty string
 * - Should use kebab-case or camelCase
 * - Should not contain spaces or special characters (except hyphens)
 * - Should be descriptive and unique
 */
export function isValidPluginName(name: string): boolean {
   if (!name || typeof name !== "string") {
      return false;
   }

   // Check for valid characters (alphanumeric, hyphens, underscores)
   const validNamePattern = /^[a-zA-Z0-9-_]+$/;
   if (!validNamePattern.test(name)) {
      return false;
   }

   // Check minimum length
   if (name.length < 2) {
      return false;
   }

   // Should not start or end with special characters
   if (/^[-_]|[-_]$/.test(name)) {
      return false;
   }

   return true;
}
