import type {
   PDFArray,
   PDFDictionary,
   PDFName,
   PDFRef,
   PDFStream,
   PDFValue,
} from "../types.ts";

/**
 * Create a PDF Name object
 */
export function createName(value: string): PDFName {
   return { type: "name", value };
}

/**
 * Create a PDF Reference
 */
export function createRef(objectNumber: number, generation = 0): PDFRef {
   if (objectNumber < 1) {
      throw new Error(`Object number must be positive, got ${objectNumber}`);
   }
   if (generation < 0 || generation > 65535) {
      throw new Error(
         `Generation number must be between 0 and 65535, got ${generation}`,
      );
   }
   return { objectNumber, generation };
}

/**
 * Create a PDF Dictionary
 */
export function createDictionary(
   entries?: Record<string, PDFValue>,
): PDFDictionary {
   if (entries) {
      return { ...entries };
   }
   return {};
}

/**
 * Create a PDF Array
 */
export function createArray(values: PDFValue[] = []): PDFArray {
   return values;
}

/**
 * Create a PDF Stream
 */
export function createStream(
   data: Uint8Array,
   dictionary?: PDFDictionary,
): PDFStream {
   return {
      dictionary: dictionary ?? createDictionary(),
      data,
   };
}

/**
 * Type guard for PDF Reference
 */
export function isRef(value: unknown): value is PDFRef {
   return (
      typeof value === "object" &&
      value !== null &&
      "objectNumber" in value &&
      "generation" in value &&
      typeof (value as PDFRef).objectNumber === "number" &&
      typeof (value as PDFRef).generation === "number"
   );
}

/**
 * Type guard for PDF Name
 */
export function isName(value: unknown): value is PDFName {
   return (
      typeof value === "object" &&
      value !== null &&
      "type" in value &&
      (value as PDFName).type === "name" &&
      "value" in value &&
      typeof (value as PDFName).value === "string"
   );
}

/**
 * Type guard for PDF Dictionary
 */
export function isDictionary(value: unknown): value is PDFDictionary {
   return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      !isRef(value) &&
      !isName(value) &&
      !isStream(value)
   );
}

/**
 * Type guard for PDF Stream
 */
export function isStream(value: unknown): value is PDFStream {
   return (
      typeof value === "object" &&
      value !== null &&
      "dictionary" in value &&
      "data" in value &&
      typeof (value as PDFStream).dictionary === "object" &&
      (value as PDFStream).dictionary !== null &&
      (value as PDFStream).data instanceof Uint8Array
   );
}

/**
 * Type guard for PDF Array
 */
export function isArray(value: unknown): value is PDFArray {
   return Array.isArray(value);
}
