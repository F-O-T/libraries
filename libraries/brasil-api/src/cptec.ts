import { z } from "zod";
import { fetchApi } from "./client";

/**
 * Schema for city information from CPTEC
 */
const CidadeSchema = z.object({
   id: z.number(),
   nome: z.string(),
   estado: z.string(),
});

/**
 * Type for city from CPTEC
 */
export type Cidade = z.infer<typeof CidadeSchema>;

/**
 * Schema for array of cities
 */
const CidadesArraySchema = z.array(CidadeSchema);

/**
 * Schema for weather climate data
 */
const ClimaSchema = z.object({
   data: z.string(),
   condicao: z.string(),
   condicao_desc: z.string().optional(),
   min: z.number(),
   max: z.number(),
   indice_uv: z.number(),
});

/**
 * Schema for weather forecast
 */
const PrevisaoSchema = z.object({
   cidade: z.string(),
   estado: z.string(),
   atualizado_em: z.string(),
   clima: z.array(ClimaSchema),
});

/**
 * Type for weather forecast
 */
export type Previsao = z.infer<typeof PrevisaoSchema>;

/**
 * Schema for ocean wave data
 */
const OndaDadoSchema = z.object({
   hora: z.string().optional(),
   vento: z.number(),
   direcao_vento: z.string(),
   direcao_vento_desc: z.string().optional(),
   altura_onda: z.number(),
   direcao_onda: z.string().optional(),
   direcao_onda_desc: z.string().optional(),
   agitation: z.string(),
});

/**
 * Schema for daily ocean wave forecast
 */
const OndaDiariaSchema = z.object({
   data: z.string(),
   dados_ondas: z.array(OndaDadoSchema),
});

/**
 * Schema for ocean wave forecast
 */
const PrevisaoOndasSchema = z.object({
   cidade: z.string(),
   estado: z.string(),
   atualizado_em: z.string(),
   ondas: z.array(OndaDiariaSchema),
});

/**
 * Type for ocean wave forecast
 */
export type PrevisaoOndas = z.infer<typeof PrevisaoOndasSchema>;

/**
 * Get all cities available for weather forecast from CPTEC
 *
 * @returns Array of cities with ID, name, and state
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 *
 * @example
 * ```typescript
 * const cities = await getCidades();
 * console.log(cities);
 * // [
 * //   { id: 244, nome: "São Paulo", estado: "SP" },
 * //   { id: 201, nome: "Rio de Janeiro", estado: "RJ" },
 * //   ...
 * // ]
 * ```
 */
export async function getCidades(): Promise<Cidade[]> {
   return fetchApi("/cptec/v1/cidade", CidadesArraySchema);
}

/**
 * Get weather forecast for a specific city
 *
 * @param cityCode - CPTEC city code
 * @param days - Number of days for forecast (1-6, default: 1)
 * @returns Weather forecast with city info and climate data
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 * @throws {BrasilApiNotFoundError} If city not found
 *
 * @example
 * ```typescript
 * const forecast = await getPrevisao(244, 3);
 * console.log(forecast);
 * // {
 * //   cidade: "São Paulo",
 * //   estado: "SP",
 * //   atualizado_em: "2024-01-30 10:00:00",
 * //   clima: [
 * //     {
 * //       data: "2024-01-30",
 * //       condicao: "ps",
 * //       min: 18,
 * //       max: 28,
 * //       indice_uv: 8
 * //     },
 * //     ...
 * //   ]
 * // }
 * ```
 */
export async function getPrevisao(
   cityCode: number,
   days: number = 1,
): Promise<Previsao> {
   return fetchApi(
      `/cptec/v1/clima/previsao/${cityCode}/${days}`,
      PrevisaoSchema,
   );
}

/**
 * Get ocean wave forecast for coastal cities
 *
 * @param cityCode - CPTEC city code (coastal city)
 * @returns Ocean wave forecast with wind, wave height, and agitation data
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 * @throws {BrasilApiNotFoundError} If city not found
 *
 * @example
 * ```typescript
 * const waves = await getPrevisaoOndas(241);
 * console.log(waves);
 * // {
 * //   cidade: "Santos",
 * //   estado: "SP",
 * //   atualizado_em: "2024-01-30 10:00:00",
 * //   ondas: [
 * //     {
 * //       data: "2024-01-30",
 * //       dados_ondas: [
 * //         {
 * //           vento: 15,
 * //           direcao_vento: "SE",
 * //           vento_medio: 12,
 * //           agitation: "Fraca",
 * //           altura_onda: 1.2
 * //         },
 * //         ...
 * //       ]
 * //     },
 * //     ...
 * //   ]
 * // }
 * ```
 */
export async function getPrevisaoOndas(
   cityCode: number,
): Promise<PrevisaoOndas> {
   return fetchApi(`/cptec/v1/ondas/${cityCode}`, PrevisaoOndasSchema);
}
