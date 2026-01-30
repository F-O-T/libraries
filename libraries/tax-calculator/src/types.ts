import type { z } from "zod";
import {
   BrazilianStateSchema,
   CFOPCodeSchema,
   NCMCodeSchema,
   OperationTypeSchema,
   TaxCalculationParamsSchema,
   TaxCalculationResultSchema,
   TaxComponentSchema,
   TaxRegimeSchema,
} from "./schemas";

/**
 * Brazilian state code (UF)
 */
export type BrazilianState = z.infer<typeof BrazilianStateSchema>;

/**
 * Type of fiscal operation
 */
export type OperationType = z.infer<typeof OperationTypeSchema>;

/**
 * Brazilian tax regime
 */
export type TaxRegime = z.infer<typeof TaxRegimeSchema>;

/**
 * NCM code (8 digits)
 */
export type NCMCode = z.infer<typeof NCMCodeSchema>;

/**
 * CFOP code (4 digits)
 */
export type CFOPCode = z.infer<typeof CFOPCodeSchema>;

/**
 * Parameters for tax calculation
 */
export type TaxCalculationParams = z.infer<typeof TaxCalculationParamsSchema>;

/**
 * Individual tax component
 */
export type TaxComponent = z.infer<typeof TaxComponentSchema>;

/**
 * Complete tax calculation result
 */
export type TaxCalculationResult = z.infer<typeof TaxCalculationResultSchema>;

// Re-export schemas
export {
   BrazilianStateSchema,
   CFOPCodeSchema,
   NCMCodeSchema,
   OperationTypeSchema,
   TaxCalculationParamsSchema,
   TaxCalculationResultSchema,
   TaxComponentSchema,
   TaxRegimeSchema,
};
