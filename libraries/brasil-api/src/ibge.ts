import { z } from "zod";
import { fetchApi } from "./client";
import { BrasilApiValidationError } from "./errors";

/**
 * Schema for validating state code input
 */
const StateCodeInputSchema = z
   .string()
   .regex(/^[A-Z]{2}$/i, "State code must be 2 letters");

/**
 * Schema for region (regiao) object
 */
const RegiaoSchema = z.object({
   id: z.number(),
   sigla: z.string(),
   nome: z.string(),
});

/**
 * Schema for a Brazilian state (estado)
 */
const EstadoSchema = z.object({
   id: z.number(),
   sigla: z.string(),
   nome: z.string(),
   regiao: RegiaoSchema,
});

/**
 * Type for a Brazilian state
 */
export type Estado = z.infer<typeof EstadoSchema>;

/**
 * Schema for array of states
 */
const EstadosArraySchema = z.array(EstadoSchema);

/**
 * Schema for a Brazilian municipality (municipio)
 */
const MunicipioSchema = z.object({
   nome: z.string(),
   codigo_ibge: z.string(),
});

/**
 * Type for a Brazilian municipality
 */
export type Municipio = z.infer<typeof MunicipioSchema>;

/**
 * Schema for array of municipalities
 */
const MunicipiosArraySchema = z.array(MunicipioSchema);

/**
 * Get all Brazilian states
 *
 * @returns Array of states with id, sigla, nome, and regiao
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 *
 * @example
 * ```typescript
 * const estados = await getEstados();
 * console.log(estados);
 * // [
 * //   {
 * //     id: 35,
 * //     sigla: "SP",
 * //     nome: "São Paulo",
 * //     regiao: { id: 3, sigla: "SE", nome: "Sudeste" }
 * //   },
 * //   ...
 * // ]
 * ```
 */
export async function getEstados(): Promise<Estado[]> {
   return fetchApi("/ibge/uf/v1", EstadosArraySchema);
}

/**
 * Get municipalities by state code
 *
 * @param uf - State code (2 letters, case-insensitive)
 * @returns Array of municipalities with nome and codigo_ibge
 * @throws {BrasilApiValidationError} If state code is invalid
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 *
 * @example
 * ```typescript
 * const municipios = await getMunicipios("SP");
 * console.log(municipios);
 * // [
 * //   { nome: "São Paulo", codigo_ibge: "3550308" },
 * //   { nome: "Campinas", codigo_ibge: "3509502" },
 * //   ...
 * // ]
 * ```
 */
export async function getMunicipios(uf: string): Promise<Municipio[]> {
   // Validate input
   const validationResult = StateCodeInputSchema.safeParse(uf);

   if (!validationResult.success) {
      throw new BrasilApiValidationError(
         "Invalid state code format",
         validationResult.error,
         "input",
      );
   }

   // Convert to uppercase for API call
   const ufUpper = uf.toUpperCase();

   return fetchApi(`/ibge/municipios/v1/${ufUpper}`, MunicipiosArraySchema);
}
