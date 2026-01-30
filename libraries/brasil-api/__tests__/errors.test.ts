import { describe, expect, test } from "bun:test";
import { ZodError } from "zod";
import {
   BrasilApiError,
   BrasilApiNetworkError,
   BrasilApiResponseError,
   BrasilApiValidationError,
} from "../src/errors";

describe("BrasilApiError", () => {
   test("should create base error", () => {
      const error = new BrasilApiError("Test error");
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("BrasilApiError");
      expect(error.message).toBe("Test error");
   });
});

describe("BrasilApiNetworkError", () => {
   test("should create network error with status code", () => {
      const error = new BrasilApiNetworkError(
         "Network failed",
         500,
         "/banks/v1",
      );
      expect(error).toBeInstanceOf(BrasilApiError);
      expect(error.name).toBe("BrasilApiNetworkError");
      expect(error.statusCode).toBe(500);
      expect(error.endpoint).toBe("/banks/v1");
   });

   test("should create network error without status code", () => {
      const error = new BrasilApiNetworkError(
         "Timeout",
         undefined,
         "/cep/v1/01310100",
      );
      expect(error.statusCode).toBeUndefined();
   });
});

describe("BrasilApiValidationError", () => {
   test("should wrap ZodError for input validation", () => {
      const zodError = new ZodError([
         {
            code: "invalid_type",
            expected: "string",
            received: "number",
            path: ["cep"],
            message: "Expected string, received number",
         },
      ]);

      const error = new BrasilApiValidationError(
         "Invalid input",
         zodError,
         "input",
      );
      expect(error).toBeInstanceOf(BrasilApiError);
      expect(error.name).toBe("BrasilApiValidationError");
      expect(error.zodError).toBe(zodError);
      expect(error.validationType).toBe("input");
   });

   test("should format helpful error message", () => {
      const zodError = new ZodError([
         {
            code: "invalid_type",
            expected: "string",
            received: "number",
            path: ["cep"],
            message: "Expected string, received number",
         },
      ]);

      const error = new BrasilApiValidationError(
         "Invalid CEP format",
         zodError,
         "input",
      );
      expect(error.message).toContain("Invalid CEP format");
      expect(error.message).toContain("cep");
   });
});

describe("BrasilApiResponseError", () => {
   test("should create response validation error", () => {
      const zodError = new ZodError([
         {
            code: "invalid_type",
            expected: "string",
            received: "undefined",
            path: ["state"],
            message: "Required",
         },
      ]);

      const error = new BrasilApiResponseError(
         "Invalid API response",
         zodError,
      );
      expect(error).toBeInstanceOf(BrasilApiValidationError);
      expect(error.name).toBe("BrasilApiResponseError");
      expect(error.validationType).toBe("response");
   });
});
