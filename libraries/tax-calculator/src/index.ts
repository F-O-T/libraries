// =============================================================================
// @f-o-t/tax-calculator - Brazilian tax calculation library
// =============================================================================

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

// NCM Registry
export type { NCMDetails } from "./registry/ncm";
export {
   clearNCM,
   getNCM,
   hasNCM,
   registerNCM,
   validateNCM,
} from "./registry/ncm";

// CFOP Registry
export type { CFOPDetails } from "./registry/cfop";
export {
   clearCFOP,
   getCFOP,
   getCFOPOperation,
   hasCFOP,
   registerCFOP,
   validateCFOP,
} from "./registry/cfop";

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
