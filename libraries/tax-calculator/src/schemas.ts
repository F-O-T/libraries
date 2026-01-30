import { MoneySchema } from "@f-o-t/money";
import { z } from "zod";

/**
 * Brazilian state codes (UF - Unidade Federativa)
 * All 27 Brazilian states including the Federal District
 */
export const BrazilianStateSchema = z.enum([
   "AC", // Acre
   "AL", // Alagoas
   "AP", // Amapá
   "AM", // Amazonas
   "BA", // Bahia
   "CE", // Ceará
   "DF", // Distrito Federal
   "ES", // Espírito Santo
   "GO", // Goiás
   "MA", // Maranhão
   "MT", // Mato Grosso
   "MS", // Mato Grosso do Sul
   "MG", // Minas Gerais
   "PA", // Pará
   "PB", // Paraíba
   "PR", // Paraná
   "PE", // Pernambuco
   "PI", // Piauí
   "RJ", // Rio de Janeiro
   "RN", // Rio Grande do Norte
   "RS", // Rio Grande do Sul
   "RO", // Rondônia
   "RR", // Roraima
   "SC", // Santa Catarina
   "SP", // São Paulo
   "SE", // Sergipe
   "TO", // Tocantins
]);

/**
 * Type of fiscal operation
 * - internal: Within the same state
 * - interstate: Between different states
 */
export const OperationTypeSchema = z.enum(["internal", "interstate"]);

/**
 * Brazilian tax regime types
 * - lucro_real: Real profit taxation
 * - lucro_presumido: Presumed profit taxation
 * - simples_nacional: Simplified national taxation
 */
export const TaxRegimeSchema = z.enum([
   "lucro_real",
   "lucro_presumido",
   "simples_nacional",
]);

/**
 * NCM (Nomenclatura Comum do Mercosul) code
 * Must be exactly 8 digits
 */
export const NCMCodeSchema = z
   .string()
   .regex(/^\d{8}$/, "NCM code must be exactly 8 digits");

/**
 * CFOP (Código Fiscal de Operações e Prestações) code
 * Must be exactly 4 digits
 */
export const CFOPCodeSchema = z
   .string()
   .regex(/^\d{4}$/, "CFOP code must be exactly 4 digits");

/**
 * Parameters required for tax calculation
 */
export const TaxCalculationParamsSchema = z.object({
   /** Base value for tax calculation */
   baseValue: MoneySchema,

   /** Brazilian state where the operation occurs */
   state: BrazilianStateSchema,

   /** Type of fiscal operation */
   operation: OperationTypeSchema,

   /** NCM code (8 digits) */
   ncm: NCMCodeSchema,

   /** CFOP code (4 digits) */
   cfop: CFOPCodeSchema,

   /** Tax regime (defaults to lucro_real) */
   regime: TaxRegimeSchema.default("lucro_real"),

   /** Whether this is a service operation (ISS instead of ICMS) */
   isService: z.boolean().optional(),

   /** IBGE municipality code for ISS calculations */
   municipalityCode: z.string().optional(),

   /** Custom data for specific business rules */
   customData: z.record(z.unknown()).optional(),
});

/**
 * Individual tax component breakdown
 */
export const TaxComponentSchema = z.object({
   /** Tax name (e.g., "ICMS", "IPI") */
   name: z.string(),

   /** Tax rate as decimal (e.g., 0.18 for 18%) */
   rate: z.number(),

   /** Base value for this tax component */
   base: MoneySchema,

   /** Calculated tax amount */
   amount: MoneySchema,

   /** Base reduction percentage if applicable */
   reduction: z.number().optional(),

   /** Whether this item is exempt from this tax */
   exempt: z.boolean().optional(),
});

/**
 * Complete tax calculation result
 */
export const TaxCalculationResultSchema = z.object({
   /** Original base value */
   baseValue: MoneySchema,

   /** Breakdown of individual tax components */
   breakdown: z.object({
      /** ICMS (Imposto sobre Circulação de Mercadorias e Serviços) */
      icms: TaxComponentSchema.optional(),

      /** IPI (Imposto sobre Produtos Industrializados) */
      ipi: TaxComponentSchema.optional(),

      /** PIS (Programa de Integração Social) */
      pis: TaxComponentSchema.optional(),

      /** COFINS (Contribuição para Financiamento da Seguridade Social) */
      cofins: TaxComponentSchema.optional(),

      /** ISS (Imposto sobre Serviços) */
      iss: TaxComponentSchema.optional(),

      /** ICMS-ST (Substituição Tributária) */
      st: TaxComponentSchema.optional(),
   }),

   /** Total tax amount (sum of all components) */
   total: MoneySchema,

   /** Metadata about the calculation */
   metadata: z.object({
      regime: TaxRegimeSchema,
      state: BrazilianStateSchema,
      operation: OperationTypeSchema,
      ncm: NCMCodeSchema,
      cfop: CFOPCodeSchema,
   }),
});
