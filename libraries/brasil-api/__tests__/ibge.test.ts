import { describe, expect, test } from "bun:test";
import { BrasilApiValidationError } from "../src/errors";
import { getEstados, getMunicipios } from "../src/ibge";

describe("getEstados", () => {
   describe("successful API calls", () => {
      test("should return array of states", async () => {
         const estados = await getEstados();
         expect(Array.isArray(estados)).toBe(true);
         expect(estados.length).toBe(27); // Brazil has 26 states + 1 federal district
      });

      test("should return states with correct schema", async () => {
         const estados = await getEstados();
         const estado = estados[0];

         expect(estado).toHaveProperty("id");
         expect(estado).toHaveProperty("sigla");
         expect(estado).toHaveProperty("nome");
         expect(estado).toHaveProperty("regiao");

         expect(typeof estado.id).toBe("number");
         expect(typeof estado.sigla).toBe("string");
         expect(typeof estado.nome).toBe("string");
         expect(typeof estado.regiao).toBe("object");
      });

      test("should return states with valid regiao schema", async () => {
         const estados = await getEstados();
         const estado = estados[0];

         expect(estado.regiao).toHaveProperty("id");
         expect(estado.regiao).toHaveProperty("sigla");
         expect(estado.regiao).toHaveProperty("nome");

         expect(typeof estado.regiao.id).toBe("number");
         expect(typeof estado.regiao.sigla).toBe("string");
         expect(typeof estado.regiao.nome).toBe("string");
      });

      test("should include expected Brazilian states", async () => {
         const estados = await getEstados();
         const siglas = estados.map((e) => e.sigla);

         expect(siglas).toContain("SP"); // São Paulo
         expect(siglas).toContain("RJ"); // Rio de Janeiro
         expect(siglas).toContain("MG"); // Minas Gerais
         expect(siglas).toContain("DF"); // Distrito Federal
      });
   });
});

describe("getMunicipios", () => {
   describe("input validation", () => {
      test("should throw BrasilApiValidationError for invalid state code (too short)", () => {
         expect(() => getMunicipios("S")).toThrow(BrasilApiValidationError);
         expect(() => getMunicipios("S")).toThrow(
            "State code must be 2 letters",
         );
      });

      test("should throw BrasilApiValidationError for invalid state code (too long)", () => {
         expect(() => getMunicipios("SPP")).toThrow(BrasilApiValidationError);
         expect(() => getMunicipios("SPP")).toThrow(
            "State code must be 2 letters",
         );
      });

      test("should throw BrasilApiValidationError for invalid state code (contains numbers)", () => {
         expect(() => getMunicipios("S1")).toThrow(BrasilApiValidationError);
         expect(() => getMunicipios("S1")).toThrow(
            "State code must be 2 letters",
         );
      });

      test("should throw BrasilApiValidationError for empty state code", () => {
         expect(() => getMunicipios("")).toThrow(BrasilApiValidationError);
         expect(() => getMunicipios("")).toThrow(
            "State code must be 2 letters",
         );
      });

      test("should accept valid state code in lowercase", () => {
         expect(() => getMunicipios("sp")).not.toThrow();
      });

      test("should accept valid state code in uppercase", () => {
         expect(() => getMunicipios("SP")).not.toThrow();
      });

      test("should accept valid state code in mixed case", () => {
         expect(() => getMunicipios("Sp")).not.toThrow();
      });
   });

   describe("successful API calls", () => {
      test("should return array of municipalities", async () => {
         const municipios = await getMunicipios("SP");
         expect(Array.isArray(municipios)).toBe(true);
         expect(municipios.length).toBeGreaterThan(0);
      });

      test("should return municipalities with correct schema", async () => {
         const municipios = await getMunicipios("SP");
         const municipio = municipios[0];

         expect(municipio).toHaveProperty("nome");
         expect(municipio).toHaveProperty("codigo_ibge");

         expect(typeof municipio.nome).toBe("string");
         expect(typeof municipio.codigo_ibge).toBe("string");
      });

      test("should convert state code to uppercase", async () => {
         const municipiosLower = await getMunicipios("sp");
         const municipiosUpper = await getMunicipios("SP");

         expect(municipiosLower.length).toBe(municipiosUpper.length);
         expect(municipiosLower[0].nome).toBe(municipiosUpper[0].nome);
      });

      test("should include expected São Paulo municipalities", async () => {
         const municipios = await getMunicipios("SP");
         const nomes = municipios.map((m) => m.nome);

         // Municipality names are returned in uppercase from the API
         expect(
            nomes.some((nome) => nome.toUpperCase().includes("SÃO PAULO")),
         ).toBe(true);
         expect(
            nomes.some((nome) => nome.toUpperCase().includes("CAMPINAS")),
         ).toBe(true);
      });

      test("should return different results for different states", async () => {
         const municipiosSP = await getMunicipios("SP");
         const municipiosRJ = await getMunicipios("RJ");

         expect(municipiosSP.length).not.toBe(municipiosRJ.length);
      });
   });
});
