// =============================================================================
// @f-o-t/tax-calculator - Brazilian tax calculation library
// =============================================================================

// Tax rate configuration
export type {
   ICMSStateConfig,
   ISSMunicipalityConfig,
   TaxRateConfig,
} from "./config/rates";
export {
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
} from "./config/rates";
export {
   BrazilianStateSchema,
   CFOPCodeSchema,
   NCMCodeSchema,
   OperationTypeSchema,
   TaxCalculationParamsSchema,
   TaxCalculationResultSchema,
   TaxComponentSchema,
   TaxRegimeSchema,
} from "./schemas";
// Types and schemas
export type {
   BrazilianState,
   CFOPCode,
   NCMCode,
   OperationType,
   TaxCalculationParams,
   TaxCalculationResult,
   TaxComponent,
   TaxRegime,
} from "./types";
