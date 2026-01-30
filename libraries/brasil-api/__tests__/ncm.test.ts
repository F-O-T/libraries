import { describe, expect, test } from "bun:test";
import { getNcm, getNcms } from "../src/ncm";

describe("getNcms", () => {
   describe("successful API calls", () => {
      test("should return array of NCM codes", async () => {
         const ncms = await getNcms();
         expect(Array.isArray(ncms)).toBe(true);
         expect(ncms.length).toBeGreaterThan(0);
      });

      test("should return NCM codes with correct schema", async () => {
         const ncms = await getNcms();
         const ncm = ncms[0];

         expect(ncm).toHaveProperty("codigo");
         expect(ncm).toHaveProperty("descricao");
         expect(ncm).toHaveProperty("data_inicio");
         expect(ncm).toHaveProperty("data_fim");
         expect(ncm).toHaveProperty("tipo_ato");
         expect(ncm).toHaveProperty("numero_ato");
         expect(ncm).toHaveProperty("ano_ato");

         expect(typeof ncm.codigo).toBe("string");
         expect(typeof ncm.descricao).toBe("string");
         expect(typeof ncm.data_inicio).toBe("string");
         expect(typeof ncm.data_fim).toBe("string");
         expect(typeof ncm.tipo_ato).toBe("string");
         expect(typeof ncm.numero_ato).toBe("string");
         expect(typeof ncm.ano_ato).toBe("string");
      });

      test("should return valid NCM code format", async () => {
         const ncms = await getNcms();
         const ncm = ncms[0];

         // NCM codes are strings (may include dots or be various lengths)
         expect(typeof ncm.codigo).toBe("string");
         expect(ncm.codigo.length).toBeGreaterThan(0);
      });
   });
});

describe("getNcm", () => {
   describe("successful API calls", () => {
      test("should return NCM for valid code", async () => {
         const code = "01012100";
         const ncm = await getNcm(code);

         expect(ncm).toHaveProperty("codigo");
         expect(ncm).toHaveProperty("descricao");
         expect(typeof ncm.codigo).toBe("string");
         expect(typeof ncm.descricao).toBe("string");
      });

      test("should return NCM with all required fields", async () => {
         const code = "01012100";
         const ncm = await getNcm(code);

         expect(ncm).toHaveProperty("codigo");
         expect(ncm).toHaveProperty("descricao");
         expect(ncm).toHaveProperty("data_inicio");
         expect(ncm).toHaveProperty("data_fim");
         expect(ncm).toHaveProperty("tipo_ato");
         expect(ncm).toHaveProperty("numero_ato");
         expect(ncm).toHaveProperty("ano_ato");
      });

      test("should return NCM code that matches or is formatted version", async () => {
         const code = "01012100";
         const ncm = await getNcm(code);

         // API may return formatted version with dots (e.g., "0101.21.00")
         expect(typeof ncm.codigo).toBe("string");
         expect(ncm.codigo.replace(/\./g, "")).toBe(code);
      });
   });
});
