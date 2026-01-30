import { describe, expect, test } from "bun:test";
import {
   BrazilianStateSchema,
   CFOPCodeSchema,
   NCMCodeSchema,
   OperationTypeSchema,
   TaxCalculationParamsSchema,
   TaxCalculationResultSchema,
   TaxComponentSchema,
   TaxRegimeSchema,
} from "../src/schemas";

describe("BrazilianStateSchema", () => {
   test("accepts all 27 valid Brazilian state codes", () => {
      const states = [
         "AC",
         "AL",
         "AP",
         "AM",
         "BA",
         "CE",
         "DF",
         "ES",
         "GO",
         "MA",
         "MT",
         "MS",
         "MG",
         "PA",
         "PB",
         "PR",
         "PE",
         "PI",
         "RJ",
         "RN",
         "RS",
         "RO",
         "RR",
         "SC",
         "SP",
         "SE",
         "TO",
      ];

      for (const state of states) {
         const result = BrazilianStateSchema.safeParse(state);
         expect(result.success).toBe(true);
      }
   });

   test("rejects invalid state codes", () => {
      const invalid = ["XX", "ZZ", "BR", "SP1", "", "sp", "Sp"];

      for (const state of invalid) {
         const result = BrazilianStateSchema.safeParse(state);
         expect(result.success).toBe(false);
      }
   });
});

describe("OperationTypeSchema", () => {
   test("accepts internal operation", () => {
      const result = OperationTypeSchema.safeParse("internal");
      expect(result.success).toBe(true);
   });

   test("accepts interstate operation", () => {
      const result = OperationTypeSchema.safeParse("interstate");
      expect(result.success).toBe(true);
   });

   test("rejects invalid operation types", () => {
      const invalid = ["international", "export", "import", "", "Internal"];

      for (const type of invalid) {
         const result = OperationTypeSchema.safeParse(type);
         expect(result.success).toBe(false);
      }
   });
});

describe("TaxRegimeSchema", () => {
   test("accepts lucro_real", () => {
      const result = TaxRegimeSchema.safeParse("lucro_real");
      expect(result.success).toBe(true);
   });

   test("accepts lucro_presumido", () => {
      const result = TaxRegimeSchema.safeParse("lucro_presumido");
      expect(result.success).toBe(true);
   });

   test("accepts simples_nacional", () => {
      const result = TaxRegimeSchema.safeParse("simples_nacional");
      expect(result.success).toBe(true);
   });

   test("rejects invalid tax regimes", () => {
      const invalid = ["mei", "normal", "special", "", "Lucro_Real"];

      for (const regime of invalid) {
         const result = TaxRegimeSchema.safeParse(regime);
         expect(result.success).toBe(false);
      }
   });
});

describe("NCMCodeSchema", () => {
   test("accepts valid 8-digit NCM codes", () => {
      const valid = ["12345678", "00000000", "99999999", "85234910"];

      for (const code of valid) {
         const result = NCMCodeSchema.safeParse(code);
         expect(result.success).toBe(true);
      }
   });

   test("rejects invalid NCM codes", () => {
      const invalid = [
         "1234567", // 7 digits
         "123456789", // 9 digits
         "1234567a", // contains letter
         "12.345.678", // contains dots
         "",
         "12-34-5678",
         "12 34 56 78", // spaces
      ];

      for (const code of invalid) {
         const result = NCMCodeSchema.safeParse(code);
         expect(result.success).toBe(false);
      }
   });
});

describe("CFOPCodeSchema", () => {
   test("accepts valid 4-digit CFOP codes", () => {
      const valid = ["1234", "5102", "6102", "0000", "9999"];

      for (const code of valid) {
         const result = CFOPCodeSchema.safeParse(code);
         expect(result.success).toBe(true);
      }
   });

   test("rejects invalid CFOP codes", () => {
      const invalid = [
         "123", // 3 digits
         "12345", // 5 digits
         "123a", // contains letter
         "12.34", // contains dot
         "",
         "51-02",
         "51 02", // space
      ];

      for (const code of invalid) {
         const result = CFOPCodeSchema.safeParse(code);
         expect(result.success).toBe(false);
      }
   });
});

describe("TaxComponentSchema", () => {
   test("accepts valid tax component with all required fields", () => {
      const component = {
         name: "ICMS",
         rate: 0.18,
         base: { amount: "1000.00", currency: "BRL" },
         amount: { amount: "180.00", currency: "BRL" },
      };

      const result = TaxComponentSchema.safeParse(component);
      expect(result.success).toBe(true);
      if (result.success) {
         expect(result.data.name).toBe("ICMS");
         expect(result.data.rate).toBe(0.18);
         expect(result.data.base.amount).toBe("1000.00");
         expect(result.data.amount.amount).toBe("180.00");
      }
   });

   test("accepts tax component with optional fields", () => {
      const component = {
         name: "ICMS",
         rate: 0.18,
         base: { amount: "1000.00", currency: "BRL" },
         amount: { amount: "180.00", currency: "BRL" },
         reduction: 0.33,
         exempt: false,
      };

      const result = TaxComponentSchema.safeParse(component);
      expect(result.success).toBe(true);
      if (result.success) {
         expect(result.data.reduction).toBe(0.33);
         expect(result.data.exempt).toBe(false);
      }
   });

   test("accepts exempt tax component", () => {
      const component = {
         name: "ICMS",
         rate: 0,
         base: { amount: "1000.00", currency: "BRL" },
         amount: { amount: "0.00", currency: "BRL" },
         exempt: true,
      };

      const result = TaxComponentSchema.safeParse(component);
      expect(result.success).toBe(true);
      if (result.success) {
         expect(result.data.exempt).toBe(true);
      }
   });

   test("requires all mandatory fields", () => {
      const incomplete = {
         name: "ICMS",
         rate: 0.18,
         // missing base and amount
      };

      const result = TaxComponentSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
   });

   test("validates Money schema for amounts", () => {
      const invalid = {
         name: "ICMS",
         rate: 0.18,
         base: { amount: "invalid", currency: "BRL" },
         amount: { amount: "180.00", currency: "BRL" },
      };

      const result = TaxComponentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
   });
});

describe("TaxCalculationParamsSchema", () => {
   test("accepts valid minimal params", () => {
      const params = {
         baseValue: { amount: "1000.00", currency: "BRL" },
         state: "SP",
         operation: "internal",
         ncm: "85234910",
         cfop: "5102",
         regime: "lucro_real",
      };

      const result = TaxCalculationParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
   });

   test("applies default regime when not provided", () => {
      const params = {
         baseValue: { amount: "1000.00", currency: "BRL" },
         state: "SP",
         operation: "internal",
         ncm: "85234910",
         cfop: "5102",
      };

      const result = TaxCalculationParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
      if (result.success) {
         expect(result.data.regime).toBe("lucro_real");
      }
   });

   test("accepts params with optional service fields", () => {
      const params = {
         baseValue: { amount: "1000.00", currency: "BRL" },
         state: "SP",
         operation: "internal",
         ncm: "00000000",
         cfop: "5102",
         regime: "simples_nacional",
         isService: true,
         municipalityCode: "3550308",
      };

      const result = TaxCalculationParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
      if (result.success) {
         expect(result.data.isService).toBe(true);
         expect(result.data.municipalityCode).toBe("3550308");
      }
   });

   test("accepts params with custom data", () => {
      const params = {
         baseValue: { amount: "1000.00", currency: "BRL" },
         state: "SP",
         operation: "internal",
         ncm: "85234910",
         cfop: "5102",
         customData: {
            customerType: "corporate",
            industryCode: "manufacturing",
         },
      };

      const result = TaxCalculationParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
      if (result.success) {
         expect(result.data.customData).toBeDefined();
         expect(result.data.customData?.customerType).toBe("corporate");
      }
   });

   test("validates nested schemas", () => {
      const invalid = {
         baseValue: { amount: "1000.00", currency: "INVALID" },
         state: "XX",
         operation: "invalid",
         ncm: "123", // too short
         cfop: "12", // too short
         regime: "invalid",
      };

      const result = TaxCalculationParamsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
   });

   test("requires all mandatory fields", () => {
      const incomplete = {
         baseValue: { amount: "1000.00", currency: "BRL" },
         state: "SP",
         // missing operation, ncm, cfop
      };

      const result = TaxCalculationParamsSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
   });
});

describe("TaxCalculationResultSchema", () => {
   test("accepts valid calculation result with single tax component", () => {
      const result = {
         baseValue: { amount: "1000.00", currency: "BRL" },
         breakdown: {
            icms: {
               name: "ICMS",
               rate: 0.18,
               base: { amount: "1000.00", currency: "BRL" },
               amount: { amount: "180.00", currency: "BRL" },
            },
         },
         total: { amount: "180.00", currency: "BRL" },
         metadata: {
            regime: "lucro_real",
            state: "SP",
            operation: "internal",
            ncm: "85234910",
            cfop: "5102",
         },
      };

      const parsed = TaxCalculationResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
         expect(parsed.data.breakdown.icms?.name).toBe("ICMS");
         expect(parsed.data.breakdown.icms?.rate).toBe(0.18);
      }
   });

   test("accepts result with multiple tax components", () => {
      const result = {
         baseValue: { amount: "1000.00", currency: "BRL" },
         breakdown: {
            icms: {
               name: "ICMS",
               rate: 0.18,
               base: { amount: "1000.00", currency: "BRL" },
               amount: { amount: "180.00", currency: "BRL" },
            },
            pis: {
               name: "PIS",
               rate: 0.0165,
               base: { amount: "1000.00", currency: "BRL" },
               amount: { amount: "16.50", currency: "BRL" },
            },
            cofins: {
               name: "COFINS",
               rate: 0.076,
               base: { amount: "1000.00", currency: "BRL" },
               amount: { amount: "76.00", currency: "BRL" },
            },
            ipi: {
               name: "IPI",
               rate: 0.05,
               base: { amount: "1000.00", currency: "BRL" },
               amount: { amount: "50.00", currency: "BRL" },
            },
         },
         total: { amount: "322.50", currency: "BRL" },
         metadata: {
            regime: "lucro_real",
            state: "SP",
            operation: "interstate",
            ncm: "85234910",
            cfop: "6102",
         },
      };

      const parsed = TaxCalculationResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
         expect(parsed.data.breakdown.icms).toBeDefined();
         expect(parsed.data.breakdown.pis).toBeDefined();
         expect(parsed.data.breakdown.cofins).toBeDefined();
         expect(parsed.data.breakdown.ipi).toBeDefined();
      }
   });

   test("accepts result with ISS for service", () => {
      const result = {
         baseValue: { amount: "1000.00", currency: "BRL" },
         breakdown: {
            iss: {
               name: "ISS",
               rate: 0.05,
               base: { amount: "1000.00", currency: "BRL" },
               amount: { amount: "50.00", currency: "BRL" },
            },
         },
         total: { amount: "50.00", currency: "BRL" },
         metadata: {
            regime: "lucro_presumido",
            state: "SP",
            operation: "internal",
            ncm: "00000000",
            cfop: "5102",
         },
      };

      const parsed = TaxCalculationResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
         expect(parsed.data.breakdown.iss?.name).toBe("ISS");
      }
   });

   test("accepts result with ICMS-ST substitution", () => {
      const result = {
         baseValue: { amount: "1000.00", currency: "BRL" },
         breakdown: {
            st: {
               name: "ICMS-ST",
               rate: 0.18,
               base: { amount: "1000.00", currency: "BRL" },
               amount: { amount: "180.00", currency: "BRL" },
            },
         },
         total: { amount: "180.00", currency: "BRL" },
         metadata: {
            regime: "lucro_real",
            state: "SP",
            operation: "internal",
            ncm: "85234910",
            cfop: "5102",
         },
      };

      const parsed = TaxCalculationResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
         expect(parsed.data.breakdown.st?.name).toBe("ICMS-ST");
      }
   });

   test("accepts result with empty breakdown", () => {
      const result = {
         baseValue: { amount: "1000.00", currency: "BRL" },
         breakdown: {},
         total: { amount: "0.00", currency: "BRL" },
         metadata: {
            regime: "simples_nacional",
            state: "SP",
            operation: "internal",
            ncm: "85234910",
            cfop: "5102",
         },
      };

      const parsed = TaxCalculationResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
   });

   test("requires all mandatory fields", () => {
      const incomplete = {
         baseValue: { amount: "1000.00", currency: "BRL" },
         breakdown: {},
         // missing total and metadata
      };

      const parsed = TaxCalculationResultSchema.safeParse(incomplete);
      expect(parsed.success).toBe(false);
   });

   test("validates Money schema for all amount fields", () => {
      const invalid = {
         baseValue: { amount: "invalid", currency: "BRL" },
         breakdown: {},
         total: { amount: "0.00", currency: "BRL" },
         metadata: {
            regime: "lucro_real",
            state: "SP",
            operation: "internal",
            ncm: "85234910",
            cfop: "5102",
         },
      };

      const parsed = TaxCalculationResultSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
   });

   test("validates metadata schemas", () => {
      const invalid = {
         baseValue: { amount: "1000.00", currency: "BRL" },
         breakdown: {},
         total: { amount: "0.00", currency: "BRL" },
         metadata: {
            regime: "invalid",
            state: "XX",
            operation: "invalid",
            ncm: "123",
            cfop: "12",
         },
      };

      const parsed = TaxCalculationResultSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
   });
});
