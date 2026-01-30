import { CFOPCodeSchema } from "../schemas";
import type { OperationType } from "../types";

/**
 * CFOP (Código Fiscal de Operações e Prestações) details
 */
export interface CFOPDetails {
   code: string;
   description: string;
   operation: OperationType;
   notes?: string;
}

/**
 * Internal registry storing CFOP codes and their details
 */
const cfopRegistry = new Map<string, CFOPDetails>();

/**
 * Validates CFOP code format (4 digits)
 * Throws error if invalid
 *
 * @param code - CFOP code to validate
 * @throws Error if code format is invalid
 */
export function validateCFOP(code: string): void {
   CFOPCodeSchema.parse(code);
}

/**
 * Registers a CFOP code with description, operation type, and optional notes
 *
 * @param code - CFOP code (4 digits)
 * @param description - Description of the CFOP code
 * @param operation - Operation type (internal or interstate)
 * @param notes - Optional additional notes
 * @throws Error if code format is invalid
 */
export function registerCFOP(
   code: string,
   description: string,
   operation: OperationType,
   notes?: string,
): void {
   validateCFOP(code);

   const details: CFOPDetails = {
      code,
      description,
      operation,
   };

   if (notes !== undefined) {
      details.notes = notes;
   }

   cfopRegistry.set(code, details);
}

/**
 * Gets CFOP details for a registered code
 *
 * @param code - CFOP code (4 digits)
 * @returns CFOP details
 * @throws Error if code is not registered or format is invalid
 */
export function getCFOP(code: string): CFOPDetails {
   validateCFOP(code);

   const details = cfopRegistry.get(code);
   if (!details) {
      throw new Error(`CFOP code ${code} is not registered`);
   }

   return details;
}

/**
 * Checks if a CFOP code is registered
 *
 * @param code - CFOP code (4 digits)
 * @returns true if code is registered, false otherwise
 * @throws Error if code format is invalid
 */
export function hasCFOP(code: string): boolean {
   validateCFOP(code);
   return cfopRegistry.has(code);
}

/**
 * Gets the operation type for a registered CFOP code
 *
 * @param code - CFOP code (4 digits)
 * @returns Operation type (internal or interstate)
 * @throws Error if code is not registered or format is invalid
 */
export function getCFOPOperation(code: string): OperationType {
   const details = getCFOP(code);
   return details.operation;
}

/**
 * Clears all registered CFOP codes
 * Useful for testing and resetting state
 */
export function clearCFOP(): void {
   cfopRegistry.clear();
}

/**
 * Pre-register common CFOP codes
 * Called automatically on module initialization
 */
function initializeCommonCFOPs(): void {
   // Internal operations (within state)
   registerCFOP("5101", "Sale within state", "internal");
   registerCFOP("5102", "Sale within state - free or non-taxable", "internal");
   registerCFOP("5405", "Sale for delivery to the buyer", "internal");
   registerCFOP("1101", "Purchase within state", "internal");

   // Interstate operations (between states)
   registerCFOP("6101", "Sale to another state", "interstate");
   registerCFOP(
      "6102",
      "Sale to another state - free or non-taxable",
      "interstate",
   );
   registerCFOP(
      "6108",
      "Sale to another state - subject to tax substitution",
      "interstate",
   );
   registerCFOP("2101", "Purchase from another state", "interstate");
}

// Initialize common CFOP codes on module load
initializeCommonCFOPs();
