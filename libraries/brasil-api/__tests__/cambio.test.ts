import { describe, expect, mock, test } from "bun:test";
import { getCotacao, getMoedas } from "../src/cambio";

describe("getMoedas", () => {
   describe("successful API calls", () => {
      test("should return array of currencies", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  simbolo: "USD",
                  nome: "Dólar Americano",
                  tipo_moeda: "A",
               },
               { simbolo: "EUR", nome: "Euro", tipo_moeda: "B" },
            ]),
         );

         const currencies = await getMoedas();

         expect(Array.isArray(currencies)).toBe(true);
         expect(currencies.length).toBeGreaterThan(0);
      });

      test("should return currencies with required fields", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  simbolo: "USD",
                  nome: "Dólar Americano",
                  tipo_moeda: "A",
               },
            ]),
         );

         const currencies = await getMoedas();
         const currency = currencies[0];

         expect(currency).toHaveProperty("simbolo");
         expect(currency).toHaveProperty("nome");
         expect(currency).toHaveProperty("tipo_moeda");

         expect(typeof currency.simbolo).toBe("string");
         expect(typeof currency.nome).toBe("string");
         expect(typeof currency.tipo_moeda).toBe("string");
      });

      test("should return currencies with non-empty symbols", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  simbolo: "USD",
                  nome: "Dólar Americano",
                  tipo_moeda: "A",
               },
               { simbolo: "EUR", nome: "Euro", tipo_moeda: "B" },
            ]),
         );

         const currencies = await getMoedas();

         currencies.forEach((currency) => {
            expect(currency.simbolo.length).toBeGreaterThan(0);
         });
      });

      test("should return currencies with formatted names", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  simbolo: "USD",
                  nome: "Dólar Americano",
                  tipo_moeda: "A",
               },
               { simbolo: "EUR", nome: "Euro", tipo_moeda: "B" },
            ]),
         );

         const currencies = await getMoedas();

         currencies.forEach((currency) => {
            expect(currency.nome.length).toBeGreaterThan(0);
         });
      });

      test("should include USD currency", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  simbolo: "USD",
                  nome: "Dólar Americano",
                  tipo_moeda: "A",
               },
               { simbolo: "EUR", nome: "Euro", tipo_moeda: "B" },
            ]),
         );

         const currencies = await getMoedas();
         const usd = currencies.find((c) => c.simbolo === "USD");

         expect(usd).toBeDefined();
         expect(usd?.nome).toContain("Dólar");
      });

      test("should include EUR currency", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  simbolo: "USD",
                  nome: "Dólar Americano",
                  tipo_moeda: "A",
               },
               { simbolo: "EUR", nome: "Euro", tipo_moeda: "B" },
            ]),
         );

         const currencies = await getMoedas();
         const eur = currencies.find((c) => c.simbolo === "EUR");

         expect(eur).toBeDefined();
         expect(eur?.nome).toContain("Euro");
      });
   });
});

describe("getCotacao", () => {
   describe("successful API calls", () => {
      test("should return exchange rate for USD", async () => {
         global.fetch = mock(async () =>
            Response.json({
               moeda: "USD",
               data: "2024-01-30",
               cotacoes: [
                  {
                     paridade_compra: 1,
                     paridade_venda: 1,
                     cotacao_compra: 4.95,
                     cotacao_venda: 4.96,
                     data_hora_cotacao: "2024-01-30 13:00:00",
                     tipo_boletim: "FECHAMENTO PTAX",
                  },
               ],
            }),
         );

         const rate = await getCotacao("USD", "01-30-2024");

         expect(rate).toHaveProperty("moeda");
         expect(rate).toHaveProperty("data");
         expect(rate).toHaveProperty("cotacoes");

         expect(typeof rate.moeda).toBe("string");
         expect(typeof rate.data).toBe("string");
         expect(Array.isArray(rate.cotacoes)).toBe(true);
         expect(rate.cotacoes.length).toBeGreaterThan(0);
      });

      test("should return USD currency information", async () => {
         global.fetch = mock(async () =>
            Response.json({
               moeda: "USD",
               data: "2024-01-30",
               cotacoes: [
                  {
                     paridade_compra: 1,
                     paridade_venda: 1,
                     cotacao_compra: 4.95,
                     cotacao_venda: 4.96,
                     data_hora_cotacao: "2024-01-30 13:00:00",
                     tipo_boletim: "FECHAMENTO PTAX",
                  },
               ],
            }),
         );

         const rate = await getCotacao("USD", "01-30-2024");

         expect(rate.moeda).toBe("USD");
      });

      test("should return valid exchange rates", async () => {
         global.fetch = mock(async () =>
            Response.json({
               moeda: "USD",
               data: "2024-01-30",
               cotacoes: [
                  {
                     paridade_compra: 1,
                     paridade_venda: 1,
                     cotacao_compra: 4.95,
                     cotacao_venda: 4.96,
                     data_hora_cotacao: "2024-01-30 13:00:00",
                     tipo_boletim: "FECHAMENTO PTAX",
                  },
               ],
            }),
         );

         const rate = await getCotacao("USD", "01-30-2024");

         expect(rate.cotacoes[0].cotacao_compra).toBeGreaterThan(0);
         expect(rate.cotacoes[0].cotacao_venda).toBeGreaterThan(0);
      });

      test("should return exchange rate for EUR", async () => {
         global.fetch = mock(async () =>
            Response.json({
               moeda: "EUR",
               data: "2024-01-30",
               cotacoes: [
                  {
                     paridade_compra: 1,
                     paridade_venda: 1,
                     cotacao_compra: 5.35,
                     cotacao_venda: 5.36,
                     data_hora_cotacao: "2024-01-30 13:00:00",
                     tipo_boletim: "FECHAMENTO PTAX",
                  },
               ],
            }),
         );

         const rate = await getCotacao("EUR", "01-30-2024");

         expect(rate.moeda).toBe("EUR");
         expect(rate.cotacoes[0].cotacao_compra).toBeGreaterThan(0);
         expect(rate.cotacoes[0].cotacao_venda).toBeGreaterThan(0);
      });

      test("should return exchange rate for historical date", async () => {
         global.fetch = mock(async () =>
            Response.json({
               moeda: "USD",
               data: "2024-01-02",
               cotacoes: [
                  {
                     paridade_compra: 1,
                     paridade_venda: 1,
                     cotacao_compra: 4.85,
                     cotacao_venda: 4.86,
                     data_hora_cotacao: "2024-01-02 13:00:00",
                     tipo_boletim: "FECHAMENTO PTAX",
                  },
               ],
            }),
         );

         const rate = await getCotacao("USD", "01-02-2024");

         expect(rate.cotacoes[0]).toHaveProperty("cotacao_compra");
         expect(rate.cotacoes[0]).toHaveProperty("cotacao_venda");
         expect(rate.cotacoes[0].cotacao_compra).toBeGreaterThan(0);
      });

      test("should return valid date-time format", async () => {
         global.fetch = mock(async () =>
            Response.json({
               moeda: "USD",
               data: "2024-01-30",
               cotacoes: [
                  {
                     paridade_compra: 1,
                     paridade_venda: 1,
                     cotacao_compra: 4.95,
                     cotacao_venda: 4.96,
                     data_hora_cotacao: "2024-01-30 13:00:00",
                     tipo_boletim: "FECHAMENTO PTAX",
                  },
               ],
            }),
         );

         const rate = await getCotacao("USD", "01-30-2024");

         expect(rate.cotacoes[0].data_hora_cotacao).toMatch(
            /^\d{4}-\d{2}-\d{2}/,
         );
      });
   });
});
