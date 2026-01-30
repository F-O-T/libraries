import { z } from "zod";
import { fetchApi } from "./client";

/**
 * Schema for NCM (Nomenclatura Comum do Mercosul)
 */
const NcmSchema = z.object({
   codigo: z.string(),
   descricao: z.string(),
   data_inicio: z.string(),
   data_fim: z.string(),
   tipo_ato: z.string(),
   numero_ato: z.string(),
   ano_ato: z.string(),
});

/**
 * Type for NCM
 */
export type Ncm = z.infer<typeof NcmSchema>;

/**
 * Schema for array of NCMs
 */
const NcmsArraySchema = z.array(NcmSchema);

/**
 * Get all NCM codes
 *
 * @returns Array of NCM codes with descriptions and metadata
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 *
 * @example
 * ```typescript
 * const ncms = await getNcms();
 * console.log(ncms);
 * // [
 * //   {
 * //     codigo: "01012100",
 * //     descricao: "Reprodutores de raça pura",
 * //     data_inicio: "2017-01-01",
 * //     data_fim: "2023-03-31",
 * //     tipo_ato: "Res Camex",
 * //     numero_ato: "125",
 * //     ano_ato: "2016"
 * //   },
 * //   ...
 * // ]
 * ```
 */
export async function getNcms(): Promise<Ncm[]> {
   return fetchApi("/ncm/v1", NcmsArraySchema);
}

/**
 * Get NCM by code
 *
 * @param code - NCM code (8 digits)
 * @returns NCM information with description and metadata
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 *
 * @example
 * ```typescript
 * const ncm = await getNcm("01012100");
 * console.log(ncm);
 * // {
 * //   codigo: "01012100",
 * //   descricao: "Reprodutores de raça pura",
 * //   data_inicio: "2017-01-01",
 * //   data_fim: "2023-03-31",
 * //   tipo_ato: "Res Camex",
 * //   numero_ato: "125",
 * //   ano_ato: "2016"
 * // }
 * ```
 */
export async function getNcm(code: string): Promise<Ncm> {
   return fetchApi(`/ncm/v1/${code}`, NcmSchema);
}
