import { z } from "zod";
import { fetchApi } from "./client";
import { BrasilApiValidationError } from "./errors";

/**
 * Bank input schema (code)
 */
const BankCodeInputSchema = z.number().int().positive();

/**
 * Bank response schema
 */
const BankSchema = z.object({
   ispb: z.string(),
   name: z.string(),
   code: z.number().nullable(),
   fullName: z.string(),
});

/**
 * Bank type
 */
export type Bank = z.infer<typeof BankSchema>;

/**
 * Get all Brazilian banks
 * @returns Array of all banks
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 */
export async function getBanks(): Promise<Bank[]> {
   return fetchApi("/banks/v1", z.array(BankSchema));
}

/**
 * Get bank information by code
 * @param code Bank code (e.g., 1 for Banco do Brasil)
 * @returns Bank data
 * @throws {BrasilApiValidationError} On invalid input
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 */
export async function getBank(code: number): Promise<Bank> {
   const validationResult = BankCodeInputSchema.safeParse(code);

   if (!validationResult.success) {
      throw new BrasilApiValidationError(
         "Invalid bank code",
         validationResult.error,
         "input",
      );
   }

   return fetchApi(`/banks/v1/${code}`, BankSchema);
}
