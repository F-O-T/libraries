import { z } from "zod";
import { fetchApi } from "./client";

/**
 * Schema for broker (Corretora) from CVM
 */
const CorretoraSchema = z.object({
   cnpj: z.string(),
   type: z.string(),
   nome_social: z.string(),
   nome_comercial: z.string(),
   status: z.string(),
   email: z.string().optional(),
   telefone: z.string().optional(),
   cep: z.string().optional(),
   pais: z.string().optional(),
   uf: z.string().optional(),
   municipio: z.string().optional(),
   bairro: z.string().optional(),
   complemento: z.string().optional(),
   logradouro: z.string().optional(),
   data_patrimonio_liquido: z.string().optional(),
   valor_patrimonio_liquido: z.string().optional(),
   codigo_cvm: z.string().optional(),
   data_inicio_situacao: z.string().optional(),
   data_registro: z.string().optional(),
});

/**
 * Type for broker (Corretora) from CVM
 */
export type Corretora = z.infer<typeof CorretoraSchema>;

/**
 * Schema for array of brokers
 */
const CorretorasArraySchema = z.array(CorretoraSchema);

/**
 * Get all Brazilian brokers registered with CVM
 *
 * @returns Array of brokers with CNPJ, names, status, and contact
 * information
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 *
 * @example
 * ```typescript
 * const brokers = await getCorretoras();
 * console.log(brokers);
 * // [
 * //   {
 * //     cnpj: "00000000000000",
 * //     tipo: "Corretora de Valores",
 * //     nome_social: "Broker S.A.",
 * //     nome_comercial: "Broker",
 * //     status: "EM FUNCIONAMENTO NORMAL",
 * //     email: "contact@broker.com",
 * //     telefone: "11999999999",
 * //     ...
 * //   },
 * //   ...
 * // ]
 * ```
 */
export async function getCorretoras(): Promise<Corretora[]> {
   return fetchApi("/cvm/corretoras/v1", CorretorasArraySchema);
}

/**
 * Get a specific Brazilian broker by CNPJ from CVM
 *
 * @param cnpj - The broker's CNPJ (14 digits)
 * @returns Broker information with CNPJ, names, status, and contact
 * information
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 * @throws {BrasilApiNotFoundError} If broker not found
 *
 * @example
 * ```typescript
 * const broker = await getCorretora("00000000000000");
 * console.log(broker);
 * // {
 * //   cnpj: "00000000000000",
 * //   tipo: "Corretora de Valores",
 * //   nome_social: "Broker S.A.",
 * //   nome_comercial: "Broker",
 * //   status: "EM FUNCIONAMENTO NORMAL",
 * //   email: "contact@broker.com",
 * //   telefone: "11999999999",
 * //   ...
 * // }
 * ```
 */
export async function getCorretora(cnpj: string): Promise<Corretora> {
   return fetchApi(`/cvm/corretoras/v1/${cnpj}`, CorretoraSchema);
}
