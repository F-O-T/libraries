import { beforeEach, describe, expect, test } from "bun:test";
import { of as moneyOf } from "@f-o-t/money";
import { calculateICMS } from "../../src/calculators/icms";
import { clearTaxRates, configureTaxRates } from "../../src/config/rates";
import type { TaxCalculationParams } from "../../src/types";

describe("calculateICMS", () => {
   beforeEach(() => {
      clearTaxRates();
   });

   describe("basic calculations", () => {
      test("calculates ICMS for internal operation", () => {
         configureTaxRates({
            icms: {
               SP: { internal: 0.18, interstate: 0.12 },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         const params: TaxCalculationParams = {
            baseValue: moneyOf("1000.00", "BRL"),
            state: "SP",
            operation: "internal",
            ncm: "12345678",
            cfop: "5101",
            regime: "lucro_real",
         };

         const result = calculateICMS(params);

         expect(result.name).toBe("ICMS");
         expect(result.rate).toBe(0.18);
         expect(result.base.amount).toBe("1000.00");
         expect(result.base.currency).toBe("BRL");
         expect(result.amount.amount).toBe("180.00");
         expect(result.amount.currency).toBe("BRL");
         expect(result.exempt).toBeUndefined();
      });

      test("calculates ICMS for interstate operation", () => {
         configureTaxRates({
            icms: {
               SP: { internal: 0.18, interstate: 0.12 },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         const params: TaxCalculationParams = {
            baseValue: moneyOf("1000.00", "BRL"),
            state: "SP",
            operation: "interstate",
            ncm: "12345678",
            cfop: "6101",
            regime: "lucro_real",
         };

         const result = calculateICMS(params);

         expect(result.name).toBe("ICMS");
         expect(result.rate).toBe(0.12);
         expect(result.amount.amount).toBe("120.00");
      });

      test("calculates ICMS with different states", () => {
         configureTaxRates({
            icms: {
               RJ: { internal: 0.2, interstate: 0.12 },
               MG: { internal: 0.18, interstate: 0.12 },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         const paramsRJ: TaxCalculationParams = {
            baseValue: moneyOf("500.00", "BRL"),
            state: "RJ",
            operation: "internal",
            ncm: "12345678",
            cfop: "5101",
            regime: "lucro_real",
         };

         const resultRJ = calculateICMS(paramsRJ);
         expect(resultRJ.rate).toBe(0.2);
         expect(resultRJ.amount.amount).toBe("100.00");

         const paramsMG: TaxCalculationParams = {
            baseValue: moneyOf("500.00", "BRL"),
            state: "MG",
            operation: "internal",
            ncm: "12345678",
            cfop: "5101",
            regime: "lucro_real",
         };

         const resultMG = calculateICMS(paramsMG);
         expect(resultMG.rate).toBe(0.18);
         expect(resultMG.amount.amount).toBe("90.00");
      });
   });

   describe("base reduction", () => {
      test("applies base reduction correctly", () => {
         configureTaxRates({
            icms: {
               SP: { internal: 0.18, interstate: 0.12 },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         // Custom params with reduction
         const params = {
            baseValue: moneyOf("1000.00", "BRL"),
            state: "SP" as const,
            operation: "internal" as const,
            ncm: "12345678" as const,
            cfop: "5101" as const,
            regime: "lucro_real" as const,
            reduction: 0.2, // 20% reduction
         };

         const result = calculateICMS(params);

         expect(result.name).toBe("ICMS");
         expect(result.rate).toBe(0.18);
         expect(result.reduction).toBe(0.2);
         // Base should be 1000 * (1 - 0.2) = 800
         expect(result.base.amount).toBe("800.00");
         // Amount should be 800 * 0.18 = 144
         expect(result.amount.amount).toBe("144.00");
      });

      test("handles 50% base reduction", () => {
         configureTaxRates({
            icms: {
               SP: { internal: 0.18, interstate: 0.12 },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         const params = {
            baseValue: moneyOf("1000.00", "BRL"),
            state: "SP" as const,
            operation: "internal" as const,
            ncm: "12345678" as const,
            cfop: "5101" as const,
            regime: "lucro_real" as const,
            reduction: 0.5, // 50% reduction
         };

         const result = calculateICMS(params);

         expect(result.reduction).toBe(0.5);
         // Base should be 1000 * (1 - 0.5) = 500
         expect(result.base.amount).toBe("500.00");
         // Amount should be 500 * 0.18 = 90
         expect(result.amount.amount).toBe("90.00");
      });

      test("no reduction when not specified", () => {
         configureTaxRates({
            icms: {
               SP: { internal: 0.18, interstate: 0.12 },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         const params: TaxCalculationParams = {
            baseValue: moneyOf("1000.00", "BRL"),
            state: "SP",
            operation: "internal",
            ncm: "12345678",
            cfop: "5101",
            regime: "lucro_real",
         };

         const result = calculateICMS(params);

         expect(result.reduction).toBeUndefined();
         expect(result.base.amount).toBe("1000.00");
         expect(result.amount.amount).toBe("180.00");
      });
   });

   describe("exempt cases", () => {
      test("marks as exempt when rate is 0", () => {
         configureTaxRates({
            icms: {
               SP: { internal: 0, interstate: 0 },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         const params: TaxCalculationParams = {
            baseValue: moneyOf("1000.00", "BRL"),
            state: "SP",
            operation: "internal",
            ncm: "12345678",
            cfop: "5101",
            regime: "lucro_real",
         };

         const result = calculateICMS(params);

         expect(result.rate).toBe(0);
         expect(result.amount.amount).toBe("0.00");
         expect(result.exempt).toBe(true);
      });

      test("marks as exempt when explicit exempt flag is provided", () => {
         configureTaxRates({
            icms: {
               SP: { internal: 0.18, interstate: 0.12 },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         const params = {
            baseValue: moneyOf("1000.00", "BRL"),
            state: "SP" as const,
            operation: "internal" as const,
            ncm: "12345678" as const,
            cfop: "5101" as const,
            regime: "lucro_real" as const,
            exempt: true,
         };

         const result = calculateICMS(params);

         expect(result.exempt).toBe(true);
         expect(result.amount.amount).toBe("0.00");
      });
   });

   describe("NCM-specific rates", () => {
      test("uses NCM-specific rate override", () => {
         configureTaxRates({
            icms: {
               SP: {
                  internal: 0.18,
                  interstate: 0.12,
                  ncm: {
                     "87654321": {
                        internal: 0.12, // Reduced rate for this NCM
                        interstate: 0.07,
                     },
                  },
               },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         const params: TaxCalculationParams = {
            baseValue: moneyOf("1000.00", "BRL"),
            state: "SP",
            operation: "internal",
            ncm: "87654321",
            cfop: "5101",
            regime: "lucro_real",
         };

         const result = calculateICMS(params);

         expect(result.rate).toBe(0.12);
         expect(result.amount.amount).toBe("120.00");
      });

      test("uses default rate when NCM not in override list", () => {
         configureTaxRates({
            icms: {
               SP: {
                  internal: 0.18,
                  interstate: 0.12,
                  ncm: {
                     "87654321": {
                        internal: 0.12,
                        interstate: 0.07,
                     },
                  },
               },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         const params: TaxCalculationParams = {
            baseValue: moneyOf("1000.00", "BRL"),
            state: "SP",
            operation: "internal",
            ncm: "12345678", // Different NCM, not in override list
            cfop: "5101",
            regime: "lucro_real",
         };

         const result = calculateICMS(params);

         expect(result.rate).toBe(0.18); // Default rate
         expect(result.amount.amount).toBe("180.00");
      });
   });

   describe("CFOP operation type detection", () => {
      test("detects internal operation from CFOP code", () => {
         configureTaxRates({
            icms: {
               SP: { internal: 0.18, interstate: 0.12 },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         // CFOP 5101 is pre-registered as internal
         const params: TaxCalculationParams = {
            baseValue: moneyOf("1000.00", "BRL"),
            state: "SP",
            operation: "internal", // Explicitly provided
            ncm: "12345678",
            cfop: "5101",
            regime: "lucro_real",
         };

         const result = calculateICMS(params);

         expect(result.rate).toBe(0.18); // Internal rate
      });

      test("detects interstate operation from CFOP code", () => {
         configureTaxRates({
            icms: {
               SP: { internal: 0.18, interstate: 0.12 },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         // CFOP 6101 is pre-registered as interstate
         const params: TaxCalculationParams = {
            baseValue: moneyOf("1000.00", "BRL"),
            state: "SP",
            operation: "interstate", // Explicitly provided
            ncm: "12345678",
            cfop: "6101",
            regime: "lucro_real",
         };

         const result = calculateICMS(params);

         expect(result.rate).toBe(0.12); // Interstate rate
      });

      test("uses operation parameter when CFOP not registered", () => {
         configureTaxRates({
            icms: {
               SP: { internal: 0.18, interstate: 0.12 },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         // Custom CFOP not in registry
         const params: TaxCalculationParams = {
            baseValue: moneyOf("1000.00", "BRL"),
            state: "SP",
            operation: "interstate", // Fallback to explicit operation
            ncm: "12345678",
            cfop: "9999",
            regime: "lucro_real",
         };

         const result = calculateICMS(params);

         expect(result.rate).toBe(0.12); // Interstate rate from params
      });
   });

   describe("error cases", () => {
      test("throws error when state not configured", () => {
         configureTaxRates({
            icms: {},
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         const params: TaxCalculationParams = {
            baseValue: moneyOf("1000.00", "BRL"),
            state: "SP",
            operation: "internal",
            ncm: "12345678",
            cfop: "5101",
            regime: "lucro_real",
         };

         expect(() => calculateICMS(params)).toThrow(
            "ICMS rate not configured for state SP",
         );
      });

      test("handles zero base value", () => {
         configureTaxRates({
            icms: {
               SP: { internal: 0.18, interstate: 0.12 },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         const params: TaxCalculationParams = {
            baseValue: moneyOf("0.00", "BRL"),
            state: "SP",
            operation: "internal",
            ncm: "12345678",
            cfop: "5101",
            regime: "lucro_real",
         };

         const result = calculateICMS(params);

         expect(result.amount.amount).toBe("0.00");
         expect(result.base.amount).toBe("0.00");
      });
   });

   describe("Money library integration", () => {
      test("preserves currency throughout calculation", () => {
         configureTaxRates({
            icms: {
               SP: { internal: 0.18, interstate: 0.12 },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         const params: TaxCalculationParams = {
            baseValue: moneyOf("1000.00", "BRL"),
            state: "SP",
            operation: "internal",
            ncm: "12345678",
            cfop: "5101",
            regime: "lucro_real",
         };

         const result = calculateICMS(params);

         expect(result.base.currency).toBe("BRL");
         expect(result.amount.currency).toBe("BRL");
      });

      test("handles fractional results correctly", () => {
         configureTaxRates({
            icms: {
               SP: { internal: 0.18, interstate: 0.12 },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         const params: TaxCalculationParams = {
            baseValue: moneyOf("1234.56", "BRL"),
            state: "SP",
            operation: "internal",
            ncm: "12345678",
            cfop: "5101",
            regime: "lucro_real",
         };

         const result = calculateICMS(params);

         // 1234.56 * 0.18 = 222.2208
         // Should be properly rounded by Money library
         expect(result.amount.amount).toBe("222.22");
         expect(result.amount.currency).toBe("BRL");
      });
   });

   describe("complex scenarios", () => {
      test("combines base reduction with NCM-specific rate", () => {
         configureTaxRates({
            icms: {
               SP: {
                  internal: 0.18,
                  interstate: 0.12,
                  ncm: {
                     "87654321": {
                        internal: 0.12,
                        interstate: 0.07,
                     },
                  },
               },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         const params = {
            baseValue: moneyOf("1000.00", "BRL"),
            state: "SP" as const,
            operation: "internal" as const,
            ncm: "87654321" as const,
            cfop: "5101" as const,
            regime: "lucro_real" as const,
            reduction: 0.3, // 30% reduction
         };

         const result = calculateICMS(params);

         expect(result.rate).toBe(0.12); // NCM-specific rate
         expect(result.reduction).toBe(0.3);
         // Base: 1000 * (1 - 0.3) = 700
         expect(result.base.amount).toBe("700.00");
         // Amount: 700 * 0.12 = 84
         expect(result.amount.amount).toBe("84.00");
      });

      test("handles reduction with zero resulting base", () => {
         configureTaxRates({
            icms: {
               SP: { internal: 0.18, interstate: 0.12 },
            },
            ipi: {},
            pis: {},
            cofins: {},
            iss: {},
         });

         const params = {
            baseValue: moneyOf("1000.00", "BRL"),
            state: "SP" as const,
            operation: "internal" as const,
            ncm: "12345678" as const,
            cfop: "5101" as const,
            regime: "lucro_real" as const,
            reduction: 1.0, // 100% reduction
         };

         const result = calculateICMS(params);

         expect(result.base.amount).toBe("0.00");
         expect(result.amount.amount).toBe("0.00");
      });
   });
});
