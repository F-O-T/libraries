import { describe, expect, mock, test } from "bun:test";
import { getBank, getBanks } from "../src/banks";
import { BrasilApiValidationError } from "../src/errors";

describe("getBanks", () => {
   test("should fetch all banks", async () => {
      global.fetch = mock(async () =>
         Response.json([
            {
               ispb: "00000000",
               name: "BCO DO BRASIL S.A.",
               code: 1,
               fullName: "Banco do Brasil S.A.",
            },
            {
               ispb: "00360305",
               name: "CAIXA ECONOMICA FEDERAL",
               code: 104,
               fullName: "Caixa Econômica Federal",
            },
         ]),
      );

      const result = await getBanks();
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe(1);
   });
});

describe("getBank", () => {
   test("should fetch bank by code", async () => {
      global.fetch = mock(async () =>
         Response.json({
            ispb: "00000000",
            name: "BCO DO BRASIL S.A.",
            code: 1,
            fullName: "Banco do Brasil S.A.",
         }),
      );

      const result = await getBank(1);
      expect(result.code).toBe(1);
      expect(result.fullName).toBe("Banco do Brasil S.A.");
   });

   test("should validate bank code as number", async () => {
      expect(getBank("invalid" as any)).rejects.toThrow(
         BrasilApiValidationError,
      );
   });
});
