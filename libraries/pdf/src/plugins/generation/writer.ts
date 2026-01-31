import type { PDFValue, PDFDictionary, PDFRef, PDFStream, PDFArray, PDFName } from "../../types.ts";

/**
 * Serialize a PDF value to string
 */
export function serializeValue(value: PDFValue): string {
   if (value === null) {
      return "null";
   }
   if (typeof value === "boolean") {
      return value ? "true" : "false";
   }
   if (typeof value === "number") {
      return value.toString();
   }
   if (typeof value === "string") {
      // Escape special characters
      const escaped = value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      return `(${escaped})`;
   }
   if (isName(value)) {
      return `/${value.value}`;
   }
   if (isRef(value)) {
      return `${value.objectNumber} ${value.generation} R`;
   }
   if (Array.isArray(value)) {
      return `[${value.map(serializeValue).join(" ")}]`;
   }
   if (typeof value === "object" && !Array.isArray(value)) {
      // Dictionary
      const dict = value as Record<string, PDFValue>;
      const entries = Object.entries(dict)
         .map(([key, val]) => `/${key} ${serializeValue(val)}`)
         .join("\n");
      return `<<\n${entries}\n>>`;
   }
   return "";
}

/**
 * Serialize a PDF stream
 */
export function serializeStream(stream: PDFStream): Uint8Array {
   const dictStr = serializeValue(stream.dictionary);
   const header = new TextEncoder().encode(`${dictStr}\nstream\n`);
   const footer = new TextEncoder().encode("\nendstream");

   // Combine header, data, footer
   const result = new Uint8Array(header.length + stream.data.length + footer.length);
   result.set(header, 0);
   result.set(stream.data, header.length);
   result.set(footer, header.length + stream.data.length);

   return result;
}

/**
 * Serialize an indirect object
 */
export function serializeObject(objectNumber: number, generation: number, value: any): Uint8Array {
   const header = `${objectNumber} ${generation} obj\n`;
   let body: Uint8Array;

   if (isStream(value)) {
      body = serializeStream(value);
   } else {
      body = new TextEncoder().encode(serializeValue(value));
   }

   const footer = new TextEncoder().encode("\nendobj\n");

   const result = new Uint8Array(header.length + body.length + footer.length);
   result.set(new TextEncoder().encode(header), 0);
   result.set(body, header.length);
   result.set(footer, header.length + body.length);

   return result;
}

// Type guards
function isName(value: any): value is PDFName {
   return typeof value === "object" && value !== null && value.type === "name";
}

function isRef(value: any): value is PDFRef {
   return typeof value === "object" && value !== null && "objectNumber" in value && "generation" in value;
}

function isStream(value: any): value is PDFStream {
   return typeof value === "object" && value !== null && "data" in value && value.data instanceof Uint8Array;
}
