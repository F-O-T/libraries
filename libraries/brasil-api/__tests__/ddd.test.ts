import { describe, expect, mock, test } from "bun:test";
import { getDdd } from "../src/ddd";
import { BrasilApiValidationError } from "../src/errors";

describe("getDdd", () => {
   test("should fetch DDD data", async () => {
      global.fetch = mock(async () =>
         Response.json({
            state: "SP",
            cities: ["São Paulo", "Guarulhos", "Osasco"],
         }),
      );

      const result = await getDdd(11);
      expect(result.state).toBe("SP");
      expect(result.cities).toContain("São Paulo");
   });

   test("should validate DDD format", async () => {
      expect(getDdd(1)).rejects.toThrow(BrasilApiValidationError);
   });

   test("should accept DDD as string", async () => {
      global.fetch = mock(async () =>
         Response.json({
            state: "RJ",
            cities: ["Rio de Janeiro"],
         }),
      );

      const result = await getDdd("21");
      expect(result.state).toBe("RJ");
   });
});
