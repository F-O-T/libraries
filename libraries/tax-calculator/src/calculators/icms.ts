import {
   fromJSON,
   type Money,
   of as moneyOf,
   multiply,
   toJSON,
} from "@f-o-t/money";
import { getICMSRate } from "../config/rates";
import { getCFOPOperation, hasCFOP } from "../registry/cfop";
import type {
   OperationType,
   TaxCalculationParams,
   TaxComponent,
} from "../types";

/**
 * Extended parameters for ICMS calculation with optional reduction and exempt flags
 */
interface ICMSCalculationParams extends TaxCalculationParams {
   /** Base reduction percentage (0-1, e.g., 0.2 for 20% reduction) */
   reduction?: number;
   /** Whether this item is exempt from ICMS */
   exempt?: boolean;
}

/**
 * Calculates ICMS (Imposto sobre Circulação de Mercadorias e Serviços)
 *
 * ICMS is a Brazilian state tax on the circulation of goods and some services.
 * It's similar to a Value Added Tax (VAT) but applied at the state level.
 *
 * @param params - Tax calculation parameters
 * @returns Tax component with ICMS details
 * @throws Error if state is not configured or rate not found
 *
 * @example
 * ```typescript
 * import { calculateICMS, configureTaxRates } from "@f-o-t/tax-calculator";
 * import { of as moneyOf } from "@f-o-t/money";
 *
 * configureTaxRates({
 *   icms: {
 *     SP: { internal: 0.18, interstate: 0.12 }
 *   }
 * });
 *
 * const result = calculateICMS({
 *   baseValue: moneyOf("1000.00", "BRL"),
 *   state: "SP",
 *   operation: "internal",
 *   ncm: "12345678",
 *   cfop: "5101"
 * });
 * // result.amount = 180.00 BRL
 * ```
 */
export function calculateICMS(params: ICMSCalculationParams): TaxComponent {
   const { state, ncm, cfop } = params;

   // Convert MoneyJSON to Money for calculations
   // Handle both Money (BigInt amount) and MoneyJSON (string amount)
   const baseValueMoney =
      typeof params.baseValue.amount === "bigint"
         ? (params.baseValue as unknown as Money)
         : fromJSON(params.baseValue);

   // Determine operation type - use explicit param or detect from CFOP
   let operation: OperationType = params.operation;

   // Try to detect operation from CFOP if registered
   if (hasCFOP(cfop)) {
      operation = getCFOPOperation(cfop);
   }

   // Check if exempt
   const isExempt = params.exempt === true;

   // Get ICMS rate from configuration
   const rate = isExempt ? 0 : getICMSRate(state, operation, ncm);

   // Calculate base value with reduction if applicable
   let base: Money = baseValueMoney;
   if (params.reduction !== undefined && params.reduction > 0) {
      // Base = baseValue * (1 - reduction)
      const reductionFactor = 1 - params.reduction;
      base = multiply(baseValueMoney, reductionFactor);
   }

   // Calculate tax amount
   let amount: Money;
   if (rate === 0 || isExempt) {
      // Zero out the amount if exempt or rate is 0
      amount = moneyOf("0", baseValueMoney.currency);
   } else {
      amount = multiply(base, rate);
   }

   // Build result
   const result: TaxComponent = {
      name: "ICMS",
      rate,
      base: toJSON(base),
      amount: toJSON(amount),
   };

   // Add optional fields
   if (params.reduction !== undefined) {
      result.reduction = params.reduction;
   }

   if (rate === 0 || isExempt) {
      result.exempt = true;
   }

   return result;
}
