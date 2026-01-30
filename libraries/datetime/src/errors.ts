/**
 * Base error class for all DateTime-related errors
 */
export class DateTimeError extends Error {
   constructor(message: string) {
      super(message);
      this.name = "DateTimeError";
      // Maintains proper stack trace for where our error was thrown (only available on V8)
      if (Error.captureStackTrace) {
         Error.captureStackTrace(this, this.constructor);
      }
   }
}

/**
 * Error thrown when an invalid date is provided
 */
export class InvalidDateError extends DateTimeError {
   constructor(
      message = "Invalid date",
      public readonly input?: unknown,
   ) {
      super(message);
      this.name = "InvalidDateError";
   }
}

/**
 * Error thrown when a date string doesn't match the expected format
 */
export class InvalidFormatError extends DateTimeError {
   constructor(
      message: string,
      public readonly input?: string,
      public readonly expectedFormat?: string,
   ) {
      super(message);
      this.name = "InvalidFormatError";
   }
}

/**
 * Error thrown when an invalid timezone is specified
 */
export class InvalidTimezoneError extends DateTimeError {
   constructor(
      message: string,
      public readonly timezone?: string,
   ) {
      super(message);
      this.name = "InvalidTimezoneError";
   }
}

/**
 * Error thrown when a plugin operation fails
 */
export class PluginError extends DateTimeError {
   constructor(
      message: string,
      public readonly pluginName?: string,
   ) {
      super(message);
      this.name = "PluginError";
   }
}

/**
 * Error thrown when attempting to use functionality that requires a plugin that isn't installed
 */
export class MissingPluginError extends PluginError {
   constructor(
      public readonly requiredPlugin: string,
      message?: string,
   ) {
      super(
         message || `Missing required plugin: ${requiredPlugin}`,
         requiredPlugin,
      );
      this.name = "MissingPluginError";
   }
}
