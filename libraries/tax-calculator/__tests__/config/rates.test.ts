import { beforeEach, describe, expect, test } from "bun:test";
import {
   clearTaxRates,
   configureTaxRates,
   getCOFINSRate,
   getICMSRate,
   getIPIRate,
   getISSRate,
   getPISRate,
   getTaxRateConfig,
   hasIPIRate,
   hasISSRate,
} from "../../src/config/rates";

describe("configureTaxRates", () => {
   beforeEach(() => {
      clearTaxRates();
   });

   test("configures tax rates successfully", () => {
      const config = {
         icms: {
            SP: { internal: 0.18, interstate: 0.12 },
         },
         ipi: { "85234910": 0.05 },
         pis: { lucro_real: 0.0165 },
         cofins: { lucro_real: 0.076 },
         iss: { "3550308": { default: 0.05 } },
      };

      configureTaxRates(config);

      const retrieved = getTaxRateConfig();
      expect(retrieved).toEqual(config);
   });

   test("merges configurations on multiple calls", () => {
      configureTaxRates({
         icms: {
            SP: { internal: 0.18, interstate: 0.12 },
         },
         ipi: {},
         pis: {},
         cofins: {},
         iss: {},
      });

      configureTaxRates({
         icms: {
            RJ: { internal: 0.2, interstate: 0.12 },
         },
         ipi: {},
         pis: {},
         cofins: {},
         iss: {},
      });

      const config = getTaxRateConfig();
      expect(config.icms.SP).toBeDefined();
      expect(config.icms.RJ).toBeDefined();
   });
});

describe("getICMSRate", () => {
   beforeEach(() => {
      clearTaxRates();
      configureTaxRates({
         icms: {
            SP: {
               internal: 0.18,
               interstate: 0.12,
               ncm: {
                  "85234910": { internal: 0.25, interstate: 0.15 },
               },
            },
            RJ: { internal: 0.2, interstate: 0.12 },
         },
         ipi: {},
         pis: {},
         cofins: {},
         iss: {},
      });
   });

   test("returns internal rate for internal operation", () => {
      const rate = getICMSRate("SP", "internal");
      expect(rate).toBe(0.18);
   });

   test("returns interstate rate for interstate operation", () => {
      const rate = getICMSRate("SP", "interstate");
      expect(rate).toBe(0.12);
   });

   test("returns NCM-specific rate when NCM is provided", () => {
      const internalRate = getICMSRate("SP", "internal", "85234910");
      expect(internalRate).toBe(0.25);

      const interstateRate = getICMSRate("SP", "interstate", "85234910");
      expect(interstateRate).toBe(0.15);
   });

   test("falls back to default rate if NCM not found", () => {
      const rate = getICMSRate("SP", "internal", "12345678");
      expect(rate).toBe(0.18);
   });

   test("throws error if state not configured", () => {
      expect(() => getICMSRate("MG", "internal")).toThrow(
         "ICMS rate not configured for state MG",
      );
   });
});

describe("getIPIRate", () => {
   beforeEach(() => {
      clearTaxRates();
      configureTaxRates({
         icms: {},
         ipi: {
            "85234910": 0.05,
            "12345678": 0.1,
         },
         pis: {},
         cofins: {},
         iss: {},
      });
   });

   test("returns configured IPI rate for NCM", () => {
      const rate = getIPIRate("85234910");
      expect(rate).toBe(0.05);
   });

   test("throws error if NCM not configured", () => {
      expect(() => getIPIRate("99999999")).toThrow(
         "IPI rate not configured for NCM 99999999",
      );
   });
});

describe("getPISRate", () => {
   beforeEach(() => {
      clearTaxRates();
      configureTaxRates({
         icms: {},
         ipi: {},
         pis: {
            lucro_real: 0.0165,
            lucro_presumido: 0.0065,
            simples_nacional: 0.0,
         },
         cofins: {},
         iss: {},
      });
   });

   test("returns PIS rate for lucro_real", () => {
      const rate = getPISRate("lucro_real");
      expect(rate).toBe(0.0165);
   });

   test("returns PIS rate for lucro_presumido", () => {
      const rate = getPISRate("lucro_presumido");
      expect(rate).toBe(0.0065);
   });

   test("returns zero for simples_nacional", () => {
      const rate = getPISRate("simples_nacional");
      expect(rate).toBe(0.0);
   });

   test("throws error if regime not configured", () => {
      clearTaxRates();
      configureTaxRates({
         icms: {},
         ipi: {},
         pis: { lucro_real: 0.0165 },
         cofins: {},
         iss: {},
      });

      expect(() => getPISRate("lucro_presumido")).toThrow(
         "PIS rate not configured for regime lucro_presumido",
      );
   });
});

describe("getCOFINSRate", () => {
   beforeEach(() => {
      clearTaxRates();
      configureTaxRates({
         icms: {},
         ipi: {},
         pis: {},
         cofins: {
            lucro_real: 0.076,
            lucro_presumido: 0.03,
            simples_nacional: 0.0,
         },
         iss: {},
      });
   });

   test("returns COFINS rate for lucro_real", () => {
      const rate = getCOFINSRate("lucro_real");
      expect(rate).toBe(0.076);
   });

   test("returns COFINS rate for lucro_presumido", () => {
      const rate = getCOFINSRate("lucro_presumido");
      expect(rate).toBe(0.03);
   });

   test("returns zero for simples_nacional", () => {
      const rate = getCOFINSRate("simples_nacional");
      expect(rate).toBe(0.0);
   });

   test("throws error if regime not configured", () => {
      clearTaxRates();
      configureTaxRates({
         icms: {},
         ipi: {},
         pis: {},
         cofins: { lucro_real: 0.076 },
         iss: {},
      });

      expect(() => getCOFINSRate("lucro_presumido")).toThrow(
         "COFINS rate not configured for regime lucro_presumido",
      );
   });
});

describe("getISSRate", () => {
   beforeEach(() => {
      clearTaxRates();
      configureTaxRates({
         icms: {},
         ipi: {},
         pis: {},
         cofins: {},
         iss: {
            "3550308": {
               default: 0.05,
               services: {
                  "01.01": 0.02,
                  "07.02": 0.05,
               },
            },
            "3304557": { default: 0.03 },
         },
      });
   });

   test("returns default ISS rate for municipality", () => {
      const rate = getISSRate("3550308");
      expect(rate).toBe(0.05);
   });

   test("returns service-specific rate when provided", () => {
      const rate = getISSRate("3550308", "01.01");
      expect(rate).toBe(0.02);
   });

   test("falls back to default if service code not found", () => {
      const rate = getISSRate("3550308", "99.99");
      expect(rate).toBe(0.05);
   });

   test("returns default when no services configured", () => {
      const rate = getISSRate("3304557");
      expect(rate).toBe(0.03);
   });

   test("throws error if municipality not configured", () => {
      expect(() => getISSRate("9999999")).toThrow(
         "ISS rate not configured for municipality 9999999",
      );
   });
});

describe("hasIPIRate", () => {
   beforeEach(() => {
      clearTaxRates();
      configureTaxRates({
         icms: {},
         ipi: {
            "85234910": 0.05,
         },
         pis: {},
         cofins: {},
         iss: {},
      });
   });

   test("returns true if IPI rate exists", () => {
      expect(hasIPIRate("85234910")).toBe(true);
   });

   test("returns false if IPI rate does not exist", () => {
      expect(hasIPIRate("99999999")).toBe(false);
   });
});

describe("hasISSRate", () => {
   beforeEach(() => {
      clearTaxRates();
      configureTaxRates({
         icms: {},
         ipi: {},
         pis: {},
         cofins: {},
         iss: {
            "3550308": { default: 0.05 },
         },
      });
   });

   test("returns true if ISS rate exists", () => {
      expect(hasISSRate("3550308")).toBe(true);
   });

   test("returns false if ISS rate does not exist", () => {
      expect(hasISSRate("9999999")).toBe(false);
   });
});

describe("clearTaxRates", () => {
   test("clears all configured rates", () => {
      configureTaxRates({
         icms: { SP: { internal: 0.18, interstate: 0.12 } },
         ipi: { "85234910": 0.05 },
         pis: { lucro_real: 0.0165 },
         cofins: { lucro_real: 0.076 },
         iss: { "3550308": { default: 0.05 } },
      });

      clearTaxRates();

      const config = getTaxRateConfig();
      expect(config.icms).toEqual({});
      expect(config.ipi).toEqual({});
      expect(config.pis).toEqual({});
      expect(config.cofins).toEqual({});
      expect(config.iss).toEqual({});
   });
});

describe("getTaxRateConfig", () => {
   beforeEach(() => {
      clearTaxRates();
   });

   test("returns empty config initially", () => {
      const config = getTaxRateConfig();
      expect(config.icms).toEqual({});
      expect(config.ipi).toEqual({});
      expect(config.pis).toEqual({});
      expect(config.cofins).toEqual({});
      expect(config.iss).toEqual({});
   });

   test("returns current configuration", () => {
      const testConfig = {
         icms: { SP: { internal: 0.18, interstate: 0.12 } },
         ipi: { "85234910": 0.05 },
         pis: { lucro_real: 0.0165 },
         cofins: { lucro_real: 0.076 },
         iss: { "3550308": { default: 0.05 } },
      };

      configureTaxRates(testConfig);

      const config = getTaxRateConfig();
      expect(config).toEqual(testConfig);
   });
});
