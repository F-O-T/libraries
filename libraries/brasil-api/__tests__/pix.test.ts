import { describe, expect, mock, test } from "bun:test";
import { getPixParticipants } from "../src/pix";

describe("getPixParticipants", () => {
   describe("successful API calls", () => {
      test("should return array of PIX participants", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  ispb: "12345678",
                  nome: "Banco Exemplo",
                  nome_reduzido: "BANCO EXEMPLO",
                  modalidade_participacao: "DIRETA",
                  tipo_participacao: "PAGADOR",
                  inicio_operacao: "2020-11-03T00:00:00.000Z",
               },
               {
                  ispb: "87654321",
                  nome: "Outro Banco",
                  nome_reduzido: "OUTRO BANCO",
                  modalidade_participacao: "INDIRETA",
                  tipo_participacao: "PAGADOR",
                  inicio_operacao: "2020-11-03T00:00:00.000Z",
               },
            ]),
         );

         const participants = await getPixParticipants();
         expect(Array.isArray(participants)).toBe(true);
         expect(participants.length).toBeGreaterThan(0);
      });

      test("should return participants with correct schema", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  ispb: "12345678",
                  nome: "Banco Exemplo",
                  nome_reduzido: "BANCO EXEMPLO",
                  modalidade_participacao: "DIRETA",
                  tipo_participacao: "PAGADOR",
                  inicio_operacao: "2020-11-03T00:00:00.000Z",
               },
            ]),
         );

         const participants = await getPixParticipants();
         const participant = participants[0];

         expect(participant).toHaveProperty("ispb");
         expect(participant).toHaveProperty("nome");
         expect(participant).toHaveProperty("nome_reduzido");
         expect(participant).toHaveProperty("modalidade_participacao");
         expect(participant).toHaveProperty("tipo_participacao");
         expect(participant).toHaveProperty("inicio_operacao");

         expect(typeof participant.ispb).toBe("string");
         expect(typeof participant.nome).toBe("string");
         expect(typeof participant.nome_reduzido).toBe("string");
         expect(typeof participant.modalidade_participacao).toBe("string");
         expect(typeof participant.tipo_participacao).toBe("string");
         expect(typeof participant.inicio_operacao).toBe("string");
      });

      test("should return valid ISPB format", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  ispb: "12345678",
                  nome: "Banco Exemplo",
                  nome_reduzido: "BANCO EXEMPLO",
                  modalidade_participacao: "DIRETA",
                  tipo_participacao: "PAGADOR",
                  inicio_operacao: "2020-11-03T00:00:00.000Z",
               },
            ]),
         );

         const participants = await getPixParticipants();
         const participant = participants[0];

         // ISPB is typically 8 digits
         expect(participant.ispb).toMatch(/^\d{8}$/);
      });

      test("should return valid date format for inicio_operacao", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  ispb: "12345678",
                  nome: "Banco Exemplo",
                  nome_reduzido: "BANCO EXEMPLO",
                  modalidade_participacao: "DIRETA",
                  tipo_participacao: "PAGADOR",
                  inicio_operacao: "2020-11-03T00:00:00.000Z",
               },
            ]),
         );

         const participants = await getPixParticipants();
         const participant = participants[0];

         // Check if inicio_operacao is a valid date string
         expect(participant.inicio_operacao).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
         );
      });

      test("should include financial institutions", async () => {
         global.fetch = mock(async () =>
            Response.json(
               Array.from({ length: 15 }, (_, i) => ({
                  ispb: `${12345678 + i}`.padStart(8, "0"),
                  nome: `Banco ${i}`,
                  nome_reduzido: `BANCO ${i}`,
                  modalidade_participacao: "DIRETA",
                  tipo_participacao: "PAGADOR",
                  inicio_operacao: "2020-11-03T00:00:00.000Z",
               })),
            ),
         );

         const participants = await getPixParticipants();

         // Just verify we have a reasonable number of participants
         expect(participants.length).toBeGreaterThan(10);

         // Verify all have valid ISPB codes
         const allHaveIspb = participants.every(
            (p) => p.ispb && p.ispb.length > 0,
         );
         expect(allHaveIspb).toBe(true);
      });

      test("should have valid modalidade_participacao values", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  ispb: "12345678",
                  nome: "Banco Exemplo",
                  nome_reduzido: "BANCO EXEMPLO",
                  modalidade_participacao: "DIRETA",
                  tipo_participacao: "PAGADOR",
                  inicio_operacao: "2020-11-03T00:00:00.000Z",
               },
            ]),
         );

         const participants = await getPixParticipants();
         const participant = participants[0];

         // modalidade_participacao should be a non-empty string
         expect(participant.modalidade_participacao.length).toBeGreaterThan(0);
      });

      test("should have valid tipo_participacao values", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  ispb: "12345678",
                  nome: "Banco Exemplo",
                  nome_reduzido: "BANCO EXEMPLO",
                  modalidade_participacao: "DIRETA",
                  tipo_participacao: "PAGADOR",
                  inicio_operacao: "2020-11-03T00:00:00.000Z",
               },
            ]),
         );

         const participants = await getPixParticipants();
         const participant = participants[0];

         // tipo_participacao should be a non-empty string
         expect(participant.tipo_participacao.length).toBeGreaterThan(0);
      });
   });
});
