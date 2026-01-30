import { z } from "zod";
import { fetchApi } from "./client";
import { BrasilApiValidationError } from "./errors";

/**
 * CNPJ input schema
 * Accepts CNPJ with or without punctuation (dots, dashes, slashes)
 * Format: 12.345.678/0001-90 or 12345678000190
 */
const CnpjInputSchema = z
   .string()
   .regex(
      /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/,
      "CNPJ must be 14 digits with optional punctuation",
   );

/**
 * CNPJ response schema
 */
const CnpjResponseSchema = z.object({
   cnpj: z.string(),
   razao_social: z.string().optional(),
   nome_fantasia: z.string().optional(),
   uf: z.string().optional(),
   municipio: z.string().optional(),
   natureza_juridica: z.string().optional(),
   situacao_cadastral: z.string().optional(),
   data_inicio_atividade: z.string().optional(),
   cnae_fiscal: z.string().optional(),
   qsa: z.array(z.any()),
});

/**
 * CNPJ response type
 */
export type CnpjResponse = z.infer<typeof CnpjResponseSchema>;

/**
 * Get company information by CNPJ
 * @param cnpj CNPJ with or without punctuation (12.345.678/0001-90 or 12345678000190)
 * @returns Company data
 * @throws {BrasilApiValidationError} On invalid input
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 */
export async function getCnpj(cnpj: string): Promise<CnpjResponse> {
   const validationResult = CnpjInputSchema.safeParse(cnpj);

   if (!validationResult.success) {
      throw new BrasilApiValidationError(
         "Invalid CNPJ format",
         validationResult.error,
         "input",
      );
   }

   // Clean CNPJ: remove dots, dashes, and slashes
   const cleanCnpj = cnpj.replace(/[.\-/]/g, "");
   return fetchApi(`/cnpj/v1/${cleanCnpj}`, CnpjResponseSchema);
}
