import { z } from "zod";
import { fetchApi } from "./client";
import { BrasilApiValidationError } from "./errors";

/**
 * CEP (postal code) input schema
 */
const CepInputSchema = z
   .string()
   .regex(/^\d{5}-?\d{3}$/, "CEP must be in format 12345-678 or 12345678");

/**
 * CEP response schema (v1)
 */
const CepResponseSchema = z.object({
   cep: z.string(),
   state: z.string(),
   city: z.string(),
   neighborhood: z.string(),
   street: z.string(),
   service: z.string(),
});

/**
 * CEP response type (v1)
 */
export type CepResponse = z.infer<typeof CepResponseSchema>;

/**
 * CEP response schema (v2 with coordinates)
 */
const CepV2ResponseSchema = CepResponseSchema.extend({
   location: z.object({
      type: z.literal("Point"),
      coordinates: z.object({
         longitude: z.string(),
         latitude: z.string(),
      }),
   }),
});

/**
 * CEP response type (v2)
 */
export type CepV2Response = z.infer<typeof CepV2ResponseSchema>;

/**
 * Get address information by CEP (postal code)
 * @param cep CEP in format 12345-678 or 12345678
 * @returns Address data
 * @throws {BrasilApiValidationError} On invalid input
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 */
export async function getCep(cep: string): Promise<CepResponse> {
   const validationResult = CepInputSchema.safeParse(cep);

   if (!validationResult.success) {
      throw new BrasilApiValidationError(
         "Invalid CEP format",
         validationResult.error,
         "input",
      );
   }

   const cleanCep = cep.replace("-", "");
   return fetchApi(`/cep/v1/${cleanCep}`, CepResponseSchema);
}

/**
 * Get address information with geolocation by CEP
 * @param cep CEP in format 12345-678 or 12345678
 * @returns Address data with latitude/longitude
 * @throws {BrasilApiValidationError} On invalid input
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 */
export async function getCepV2(cep: string): Promise<CepV2Response> {
   const validationResult = CepInputSchema.safeParse(cep);

   if (!validationResult.success) {
      throw new BrasilApiValidationError(
         "Invalid CEP format",
         validationResult.error,
         "input",
      );
   }

   const cleanCep = cep.replace("-", "");
   return fetchApi(`/cep/v2/${cleanCep}`, CepV2ResponseSchema);
}
