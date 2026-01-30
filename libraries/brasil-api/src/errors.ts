import type { ZodError } from "zod";

/**
 * Base error class for Brasil API errors
 */
export class BrasilApiError extends Error {
   constructor(message: string) {
      super(message);
      this.name = "BrasilApiError";
      Object.setPrototypeOf(this, BrasilApiError.prototype);
   }
}

/**
 * Network-related errors (fetch failures, timeouts, HTTP errors)
 */
export class BrasilApiNetworkError extends BrasilApiError {
   public readonly statusCode?: number;
   public readonly endpoint: string;

   constructor(
      message: string,
      statusCode: number | undefined,
      endpoint: string,
   ) {
      super(message);
      this.name = "BrasilApiNetworkError";
      this.statusCode = statusCode;
      this.endpoint = endpoint;
      Object.setPrototypeOf(this, BrasilApiNetworkError.prototype);
   }
}

/**
 * Validation errors (input or response validation failures)
 */
export class BrasilApiValidationError extends BrasilApiError {
   public readonly zodError: ZodError;
   public readonly validationType: "input" | "response";

   constructor(
      message: string,
      zodError: ZodError,
      validationType: "input" | "response",
   ) {
      const formattedMessage = formatValidationError(
         message,
         zodError,
         validationType,
      );
      super(formattedMessage);
      this.name = "BrasilApiValidationError";
      this.zodError = zodError;
      this.validationType = validationType;
      Object.setPrototypeOf(this, BrasilApiValidationError.prototype);
   }
}

/**
 * Response validation errors (invalid API response)
 */
export class BrasilApiResponseError extends BrasilApiValidationError {
   constructor(message: string, zodError: ZodError) {
      super(message, zodError, "response");
      this.name = "BrasilApiResponseError";
      Object.setPrototypeOf(this, BrasilApiResponseError.prototype);
   }
}

/**
 * Format Zod validation error into helpful message
 */
function formatValidationError(
   baseMessage: string,
   zodError: ZodError,
   validationType: "input" | "response",
): string {
   const issues = zodError.issues
      .map((err) => {
         const path = err.path.join(".");
         return `  - ${path}: ${err.message}`;
      })
      .join("\n");

   return `${baseMessage} (${validationType} validation failed):\n${issues}`;
}
