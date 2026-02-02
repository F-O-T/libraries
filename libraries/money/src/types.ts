/**
 * Types re-exported from schemas for backward compatibility
 *
 * @deprecated Import types directly from "@f-o-t/money/schemas" or from the main package
 * All types are now defined using Zod schema inference in ./schemas.ts
 * This file is maintained only for backward compatibility.
 */
export type {
   AllocationRatios,
   DatabaseMoney,
   FormatOptions,
   Money,
   MoneyInput,
   MoneyJSON,
   RoundingMode,
} from "./schemas";
