import { z } from "zod";
import { fetchApi } from "./client";

/**
 * Schema for currency information
 */
const MoedaSchema = z.object({
   simbolo: z.string(),
   nome: z.string(),
   tipo_moeda: z.string(),
});

/**
 * Type for currency
 */
export type Moeda = z.infer<typeof MoedaSchema>;

/**
 * Schema for array of currencies
 */
const MoedasArraySchema = z.array(MoedaSchema);

/**
 * Schema for individual exchange rate quotation
 */
const CotacaoItemSchema = z.object({
   paridade_compra: z.number(),
   paridade_venda: z.number(),
   cotacao_compra: z.number(),
   cotacao_venda: z.number(),
   data_hora_cotacao: z.string(),
   tipo_boletim: z.string(),
});

/**
 * Schema for currency exchange rate response
 */
const CotacaoResponseSchema = z.object({
   moeda: z.string(),
   data: z.string(),
   cotacoes: z.array(CotacaoItemSchema),
});

/**
 * Type for currency exchange rate response
 */
export type Cotacao = z.infer<typeof CotacaoResponseSchema>;

/**
 * Get list of available currencies for exchange rate queries
 *
 * @returns Array of available currencies with symbol, name, and type
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 *
 * @example
 * ```typescript
 * const currencies = await getMoedas();
 * console.log(currencies);
 * // [
 * //   {
 * //     simbolo: "USD",
 * //     nome: "Dólar Americano",
 * //     tipo_moeda: "A"
 * //   },
 * //   {
 * //     simbolo: "EUR",
 * //     nome: "Euro",
 * //     tipo_moeda: "B"
 * //   },
 * //   ...
 * // ]
 * ```
 */
export async function getMoedas(): Promise<Moeda[]> {
   return fetchApi("/cambio/v1/moedas", MoedasArraySchema);
}

/**
 * Get exchange rate for a specific currency on a specific date
 *
 * @param moeda - Currency symbol (e.g., "USD", "EUR")
 * @param data - Date in format "MM-DD-YYYY"
 * @returns Exchange rate information with array of quotations
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 * @throws {BrasilApiNotFoundError} If rate not found for date
 *
 * @example
 * ```typescript
 * const rate = await getCotacao("USD", "01-30-2024");
 * console.log(rate);
 * // {
 * //   moeda: "USD",
 * //   data: "2024-01-30",
 * //   cotacoes: [
 * //     {
 * //       paridade_compra: 1,
 * //       paridade_venda: 1,
 * //       cotacao_compra: 4.95,
 * //       cotacao_venda: 4.96,
 * //       data_hora_cotacao: "2024-01-30 13:00:00",
 * //       tipo_boletim: "FECHAMENTO PTAX"
 * //     },
 * //     ...
 * //   ]
 * // }
 * ```
 */
export async function getCotacao(
   moeda: string,
   data: string,
): Promise<Cotacao> {
   return fetchApi(
      `/cambio/v1/cotacao/${moeda}/${data}`,
      CotacaoResponseSchema,
   );
}
