import { describe, expect, mock, test } from "bun:test";
import { getCnpj } from "../src/cnpj";
import { BrasilApiValidationError } from "../src/errors";

describe("getCnpj", () => {
   test("should fetch CNPJ data", async () => {
      global.fetch = mock(async () =>
         Response.json({
            cnpj: "06.990.590/0001-23",
            razao_social: "EMPRESA EXEMPLO LTDA",
            nome_fantasia: "Exemplo",
            uf: "SP",
            municipio: "São Paulo",
            natureza_juridica: "206-2 - Sociedade Empresária Limitada",
            situacao_cadastral: "Ativa",
            data_inicio_atividade: "2000-01-01",
            cnae_fiscal: "6201-5/00",
            qsa: [
               {
                  nome: "João Silva",
                  qual: "Sócio-Administrador",
               },
            ],
         }),
      );

      const result = await getCnpj("06.990.590/0001-23");
      expect(result.cnpj).toBe("06.990.590/0001-23");
      expect(result.razao_social).toBe("EMPRESA EXEMPLO LTDA");
      expect(result.nome_fantasia).toBe("Exemplo");
      expect(result.qsa).toHaveLength(1);
   });

   test("should accept CNPJ without punctuation", async () => {
      global.fetch = mock(async () =>
         Response.json({
            cnpj: "06990590000123",
            razao_social: "EMPRESA EXEMPLO LTDA",
            qsa: [],
         }),
      );

      const result = await getCnpj("06990590000123");
      expect(result.cnpj).toBe("06990590000123");
   });

   test("should validate CNPJ format", async () => {
      expect(getCnpj("invalid")).rejects.toThrow(BrasilApiValidationError);
   });

   test("should reject CNPJ with wrong length", async () => {
      expect(getCnpj("123456")).rejects.toThrow(BrasilApiValidationError);
   });

   test("should accept CNPJ with partial punctuation", async () => {
      global.fetch = mock(async () =>
         Response.json({
            cnpj: "06990590000123",
            razao_social: "EMPRESA EXEMPLO LTDA",
            qsa: [],
         }),
      );

      const result = await getCnpj("06990590/0001-23");
      expect(result.cnpj).toBe("06990590000123");
   });
});
