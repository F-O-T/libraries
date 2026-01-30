import { z } from "zod";
import { fetchApi } from "./client";

/**
 * Schema for PIX participant
 */
const PixParticipantSchema = z.object({
   ispb: z.string(),
   nome: z.string(),
   nome_reduzido: z.string(),
   modalidade_participacao: z.string(),
   tipo_participacao: z.string(),
   inicio_operacao: z.string(),
});

/**
 * Type for PIX participant
 */
export type PixParticipant = z.infer<typeof PixParticipantSchema>;

/**
 * Schema for array of PIX participants
 */
const PixParticipantsArraySchema = z.array(PixParticipantSchema);

/**
 * Get all PIX participants
 *
 * @returns Array of PIX participants with ISPB, names, and participation info
 * @throws {BrasilApiNetworkError} On network errors
 * @throws {BrasilApiResponseError} On invalid response
 *
 * @example
 * ```typescript
 * const participants = await getPixParticipants();
 * console.log(participants);
 * // [
 * //   {
 * //     ispb: "00000000",
 * //     nome: "Banco Central do Brasil",
 * //     nome_reduzido: "BCB",
 * //     modalidade_participacao: "DIRETO",
 * //     tipo_participacao: "LIQUIDANTE",
 * //     inicio_operacao: "2020-11-03T00:00:00.000Z"
 * //   },
 * //   ...
 * // ]
 * ```
 */
export async function getPixParticipants(): Promise<PixParticipant[]> {
   return fetchApi("/pix/v1/participants", PixParticipantsArraySchema);
}
