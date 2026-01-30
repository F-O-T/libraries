import type { ZodSchema } from "zod";
import { getConfig } from "./config";
import { BrasilApiNetworkError, BrasilApiResponseError } from "./errors";

/**
 * Fetch data from Brasil API with validation
 * @param endpoint API endpoint path (e.g., "/cep/v1/01310100")
 * @param schema Zod schema to validate response
 * @returns Validated response data
 * @throws {BrasilApiNetworkError} On network or HTTP errors
 * @throws {BrasilApiResponseError} On response validation errors
 */
export async function fetchApi<T>(
   endpoint: string,
   schema: ZodSchema<T>,
): Promise<T> {
   const config = getConfig();
   const url = `${config.baseUrl}${endpoint}`;

   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), config.timeout);

   try {
      const response = await fetch(url, {
         signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
         throw new BrasilApiNetworkError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            endpoint,
         );
      }

      const data = await response.json();

      const result = schema.safeParse(data);

      if (!result.success) {
         throw new BrasilApiResponseError(
            "Invalid API response format",
            result.error,
         );
      }

      return result.data;
   } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof BrasilApiNetworkError) {
         throw error;
      }

      if (error instanceof BrasilApiResponseError) {
         throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
         throw new BrasilApiNetworkError(
            `Request timeout after ${config.timeout}ms`,
            undefined,
            endpoint,
         );
      }

      throw new BrasilApiNetworkError(
         `Network request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
         undefined,
         endpoint,
      );
   }
}
