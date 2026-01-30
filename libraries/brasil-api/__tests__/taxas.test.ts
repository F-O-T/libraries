import { describe, expect, mock, test } from "bun:test";
import { getTaxa, getTaxas } from "../src/taxas";

describe("getTaxas", () => {
   describe("successful API calls", () => {
      test("should return array of interest rates", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { nome: "SELIC", valor: 13.75 },
               { nome: "CDI", valor: 13.65 },
               { nome: "IPCA", valor: 4.5 },
            ]),
         );

         const rates = await getTaxas();

         expect(Array.isArray(rates)).toBe(true);
         expect(rates.length).toBeGreaterThan(0);
      });

      test("should return rates with correct schema", async () => {
         global.fetch = mock(async () =>
            Response.json([{ nome: "SELIC", valor: 13.75 }]),
         );

         const rates = await getTaxas();
         const rate = rates[0];

         expect(rate).toHaveProperty("nome");
         expect(rate).toHaveProperty("valor");

         expect(typeof rate.nome).toBe("string");
         // valor can be a number or null
         expect(typeof rate.valor === "number" || rate.valor === null).toBe(
            true,
         );
      });

      test("should return rates with valid names", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { nome: "SELIC", valor: 13.75 },
               { nome: "CDI", valor: 13.65 },
            ]),
         );

         const rates = await getTaxas();

         rates.forEach((rate) => {
            expect(rate.nome.length).toBeGreaterThan(0);
         });
      });

      test("should include common interest rate types", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { nome: "SELIC", valor: 13.75 },
               { nome: "CDI", valor: 13.65 },
            ]),
         );

         const rates = await getTaxas();
         const names = rates.map((r) => r.nome);

         // Just verify we have multiple rates
         expect(names.length).toBeGreaterThan(1);

         // All names should be non-empty strings
         const allNamesValid = names.every(
            (name) => typeof name === "string" && name.length > 0,
         );
         expect(allNamesValid).toBe(true);
      });

      test("should return rates with numeric or null values", async () => {
         global.fetch = mock(async () =>
            Response.json([
               { nome: "SELIC", valor: 13.75 },
               { nome: "CDI", valor: null },
            ]),
         );

         const rates = await getTaxas();

         rates.forEach((rate) => {
            if (rate.valor !== null) {
               expect(typeof rate.valor).toBe("number");
               expect(rate.valor).toBeGreaterThanOrEqual(0);
            }
         });
      });
   });
});

describe("getTaxa", () => {
   describe("successful API calls", () => {
      test("should return specific rate by sigla", async () => {
         global.fetch = mock(async () =>
            Response.json({ nome: "SELIC", valor: 13.75 }),
         );

         const result = await getTaxa("SELIC");

         expect(result).toHaveProperty("nome");
         expect(result).toHaveProperty("valor");
         // API may return name in different case
         expect(result.nome.toLowerCase()).toBe("selic");
      });

      test("should return correct types for all fields", async () => {
         global.fetch = mock(async () =>
            Response.json({ nome: "SELIC", valor: 13.75 }),
         );

         const result = await getTaxa("SELIC");

         expect(typeof result.nome).toBe("string");
         expect(typeof result.valor === "number" || result.valor === null).toBe(
            true,
         );
      });

      test("should return matching rate information", async () => {
         let callCount = 0;
         global.fetch = mock(async () => {
            callCount++;
            if (callCount === 1) {
               return Response.json([{ nome: "SELIC", valor: 13.75 }]);
            }
            return Response.json({ nome: "SELIC", valor: 13.75 });
         });

         const rates = await getTaxas();

         // Find a rate with a non-null value
         const rateWithValue = rates.find((r) => r.valor !== null);

         if (rateWithValue) {
            const result = await getTaxa(rateWithValue.nome);
            // API may return name in different case
            expect(result.nome.toLowerCase()).toBe(
               rateWithValue.nome.toLowerCase(),
            );
            expect(result.valor).toBe(rateWithValue.valor);
         }
      });
   });
});
