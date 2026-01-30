import { describe, expect, mock, test } from "bun:test";
import { getCep, getCepV2 } from "../src/cep";
import { BrasilApiValidationError } from "../src/errors";

describe("getCep", () => {
   test("should fetch CEP data", async () => {
      global.fetch = mock(async () =>
         Response.json({
            cep: "01310-100",
            state: "SP",
            city: "São Paulo",
            neighborhood: "Bela Vista",
            street: "Avenida Paulista",
            service: "viacep",
         }),
      );

      const result = await getCep("01310-100");
      expect(result.cep).toBe("01310-100");
      expect(result.state).toBe("SP");
      expect(result.city).toBe("São Paulo");
   });

   test("should validate CEP format", async () => {
      expect(getCep("invalid")).rejects.toThrow(BrasilApiValidationError);
   });

   test("should accept CEP without dash", async () => {
      global.fetch = mock(async () =>
         Response.json({
            cep: "01310100",
            state: "SP",
            city: "São Paulo",
            neighborhood: "Bela Vista",
            street: "Avenida Paulista",
            service: "viacep",
         }),
      );

      const result = await getCep("01310100");
      expect(result.cep).toBe("01310100");
   });
});

describe("getCepV2", () => {
   test("should fetch CEP data with coordinates", async () => {
      global.fetch = mock(async () =>
         Response.json({
            cep: "01310-100",
            state: "SP",
            city: "São Paulo",
            neighborhood: "Bela Vista",
            street: "Avenida Paulista",
            service: "viacep",
            location: {
               type: "Point",
               coordinates: {
                  longitude: "-46.6564",
                  latitude: "-23.5614",
               },
            },
         }),
      );

      const result = await getCepV2("01310-100");
      expect(result.location.coordinates.latitude).toBe("-23.5614");
      expect(result.location.coordinates.longitude).toBe("-46.6564");
   });

   test("should validate CEP format", async () => {
      expect(getCepV2("123")).rejects.toThrow(BrasilApiValidationError);
   });
});
