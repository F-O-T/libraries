import { z } from "zod";
import { fetchApi } from "./client";

/**
 * Vehicle type for FIPE queries
 */
export type TipoVeiculo = "carros" | "motos" | "caminhoes";

/**
 * Schema for vehicle brand
 */
const FipeMarcaSchema = z.object({
   nome: z.string(),
   valor: z.string(),
});

/**
 * Type for vehicle brand
 */
export type FipeMarca = z.infer<typeof FipeMarcaSchema>;

/**
 * Schema for array of brands
 */
const FipeMarcasArraySchema = z.array(FipeMarcaSchema);

/**
 * Schema for vehicle price information
 */
const FipePrecoSchema = z.object({
   valor: z.string(),
   marca: z.string(),
   modelo: z.string(),
   anoModelo: z.number(),
   combustivel: z.string(),
   codigoFipe: z.string(),
   mesReferencia: z.string(),
   tipoVeiculo: z.number(),
   siglaCombustivel: z.string(),
   dataConsulta: z.string().optional(),
});

/**
 * Type for vehicle price information
 */
export type FipePreco = z.infer<typeof FipePrecoSchema>;

/**
 * Schema for FIPE reference table
 */
const FipeTabelaSchema = z.object({
   codigo: z.number(),
   mes: z.string(),
});

/**
 * Type for FIPE reference table
 */
export type FipeTabela = z.infer<typeof FipeTabelaSchema>;

/**
 * Schema for array of reference tables
 */
const FipeTabelasArraySchema = z.array(FipeTabelaSchema);

/**
 * Get list of vehicle brands from FIPE
 *
 * @param tipoVeiculo - Type of vehicle ("carros", "motos", or
 * "caminhoes")
 * @returns Array of brands with name and value code
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 *
 * @example
 * ```typescript
 * const brands = await getFipeMarcas("carros");
 * console.log(brands);
 * // [
 * //   { nome: "Acura", valor: "1" },
 * //   { nome: "Audi", valor: "2" },
 * //   { nome: "BMW", valor: "3" },
 * //   ...
 * // ]
 * ```
 */
export async function getFipeMarcas(
   tipoVeiculo: TipoVeiculo,
): Promise<FipeMarca[]> {
   return fetchApi(`/fipe/marcas/v1/${tipoVeiculo}`, FipeMarcasArraySchema);
}

/**
 * Get vehicle price information by FIPE code
 *
 * @param codigoFipe - FIPE code (e.g., "004278-1")
 * @returns Vehicle price information including brand, model, year, fuel
 * type, and price
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 * @throws {BrasilApiNotFoundError} If vehicle not found
 *
 * @example
 * ```typescript
 * const price = await getFipePreco("004278-1");
 * console.log(price);
 * // {
 * //   valor: "R$ 45.000,00",
 * //   marca: "VW - VolksWagen",
 * //   modelo: "Gol 1.0",
 * //   anoModelo: 2020,
 * //   combustivel: "Gasolina",
 * //   codigoFipe: "004278-1",
 * //   mesReferencia: "janeiro de 2024",
 * //   tipoVeiculo: 1,
 * //   siglaCombustivel: "G"
 * // }
 * ```
 */
export async function getFipePreco(codigoFipe: string): Promise<FipePreco> {
   return fetchApi(`/fipe/preco/v1/${codigoFipe}`, FipePrecoSchema);
}

/**
 * Get FIPE reference tables
 *
 * @returns Array of reference tables with code and month description
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 *
 * @example
 * ```typescript
 * const tables = await getFipeTabelas();
 * console.log(tables);
 * // [
 * //   { codigo: 290, mes: "janeiro de 2024" },
 * //   { codigo: 289, mes: "dezembro de 2023" },
 * //   { codigo: 288, mes: "novembro de 2023" },
 * //   ...
 * // ]
 * ```
 */
export async function getFipeTabelas(): Promise<FipeTabela[]> {
   return fetchApi("/fipe/tabelas/v1", FipeTabelasArraySchema);
}
