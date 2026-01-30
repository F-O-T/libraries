import { z } from "zod";
import { fetchApi } from "./client";
import { BrasilApiValidationError } from "./errors";

/**
 * DDD input schema
 */
const DddInputSchema = z.union([
   z.number().int().min(10).max(99),
   z.string().regex(/^\d{2}$/, "DDD must be 2 digits"),
]);

/**
 * DDD response schema
 */
const DddResponseSchema = z.object({
   state: z.string(),
   cities: z.array(z.string()),
});

/**
 * DDD response type
 */
export type DddResponse = z.infer<typeof DddResponseSchema>;

/**
 * Get cities by area code (DDD)
 * @param ddd Area code (2 digits)
 * @returns State and list of cities
 * @throws {BrasilApiValidationError} On invalid input
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 */
export async function getDdd(ddd: number | string): Promise<DddResponse> {
   const validationResult = DddInputSchema.safeParse(ddd);

   if (!validationResult.success) {
      throw new BrasilApiValidationError(
         "Invalid DDD format",
         validationResult.error,
         "input",
      );
   }

   return fetchApi(`/ddd/v1/${ddd}`, DddResponseSchema);
}
