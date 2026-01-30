import { z } from "zod";
import { fetchApi } from "./client";

/**
 * Schema for interest rate (Taxa)
 */
const TaxaSchema = z.object({
   nome: z.string(),
   valor: z.number().nullable(),
});

/**
 * Type for interest rate (Taxa)
 */
export type Taxa = z.infer<typeof TaxaSchema>;

/**
 * Schema for array of interest rates
 */
const TaxasArraySchema = z.array(TaxaSchema);

/**
 * Get all Brazilian interest rates
 *
 * @returns Array of interest rates with names and values
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 *
 * @example
 * ```typescript
 * const rates = await getTaxas();
 * console.log(rates);
 * // [
 * //   { nome: "SELIC", valor: 13.75 },
 * //   { nome: "CDI", valor: 13.65 },
 * //   { nome: "IPCA", valor: 4.62 },
 * //   ...
 * // ]
 * ```
 */
export async function getTaxas(): Promise<Taxa[]> {
   return fetchApi("/taxas/v1", TaxasArraySchema);
}

/**
 * Get a specific Brazilian interest rate by name/sigla
 *
 * @param sigla - The rate identifier/name (e.g., "SELIC", "CDI", "IPCA")
 * @returns Interest rate with name and value
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 * @throws {BrasilApiNotFoundError} If rate not found
 *
 * @example
 * ```typescript
 * const rate = await getTaxa("SELIC");
 * console.log(rate);
 * // { nome: "SELIC", valor: 13.75 }
 * ```
 */
export async function getTaxa(sigla: string): Promise<Taxa> {
   return fetchApi(`/taxas/v1/${sigla}`, TaxaSchema);
}
