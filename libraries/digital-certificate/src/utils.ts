/**
 * Utility functions for digital certificate handling
 *
 * PEM encoding, OID maps for Brazilian certificate fields,
 * and ASN.1 helpers.
 */

// =============================================================================
// OID Maps for Brazilian Certificates
// =============================================================================

/**
 * OIDs used in Brazilian ICP-Brasil certificates
 * to encode CNPJ and CPF in subject fields
 */
export const BRAZILIAN_OIDS: Record<string, string> = {
   // ICP-Brasil OIDs for person identification
   "2.16.76.1.3.1": "otherName-CPF",
   "2.16.76.1.3.2": "otherName-ICP-Brasil-Name",
   "2.16.76.1.3.3": "otherName-CNPJ",
   "2.16.76.1.3.4": "otherName-ICP-Brasil-Responsible",
   "2.16.76.1.3.5": "otherName-ICP-Brasil-Voter",
   "2.16.76.1.3.6": "otherName-ICP-Brasil-INSS",
   "2.16.76.1.3.7": "otherName-ICP-Brasil-CEI",
   "2.16.76.1.3.8": "otherName-ICP-Brasil-OAB",
};

// =============================================================================
// Subject Field Parsing
// =============================================================================

/**
 * Parse an X.509 subject/issuer string into key-value pairs
 *
 * Handles formats like:
 * - "CN=Name, O=Org, C=BR"
 * - "/CN=Name/O=Org/C=BR"
 */
export function parseDistinguishedName(dn: string): Record<string, string> {
   const result: Record<string, string> = {};

   if (!dn) return result;

   // Normalize different DN formats:
   // - Slash-separated: "/CN=Name/O=Org/C=BR"
   // - Newline-separated: "CN=Name\nO=Org\nC=BR" (Bun's X509Certificate)
   // - Comma-separated: "CN=Name, O=Org, C=BR"
   let normalized = dn;
   if (dn.startsWith("/")) {
      normalized = dn.slice(1).split("/").join(", ");
   } else if (dn.includes("\n")) {
      normalized = dn.split("\n").join(", ");
   }

   // Split by ", " but respect escaped commas and quoted values
   const parts = splitDnParts(normalized);

   for (const part of parts) {
      const eqIdx = part.indexOf("=");
      if (eqIdx !== -1) {
         const key = part.slice(0, eqIdx).trim();
         const value = part.slice(eqIdx + 1).trim();
         result[key] = value;
      }
   }

   return result;
}

function splitDnParts(dn: string): string[] {
   const parts: string[] = [];
   let current = "";
   let inQuotes = false;

   for (let i = 0; i < dn.length; i++) {
      const ch = dn[i]!;

      if (ch === '"') {
         inQuotes = !inQuotes;
         current += ch;
      } else if (ch === "," && !inQuotes) {
         parts.push(current.trim());
         current = "";
      } else {
         current += ch;
      }
   }

   if (current.trim()) {
      parts.push(current.trim());
   }

   return parts;
}

// =============================================================================
// CNPJ/CPF Extraction
// =============================================================================

/**
 * Extract CNPJ from certificate subject string
 * Looks for patterns like:
 * - OU with CNPJ: "OU=CNPJ:12345678000190"
 * - Direct in CN or subject alternative names
 */
export function extractCnpj(subjectRaw: string): string | null {
   // Pattern: explicit CNPJ label in any field
   const cnpjMatch = subjectRaw.match(/CNPJ[:\s=]+(\d{14})/i);
   if (cnpjMatch?.[1]) return cnpjMatch[1];

   // Pattern: 14-digit sequence in CN, OU, or any field
   const fieldMatch = subjectRaw.match(/(CN|OU)\s*=\s*[^,]*?(\d{14})/);
   if (fieldMatch?.[2]) return fieldMatch[2];

   return null;
}

/**
 * Extract CPF from certificate subject string
 */
export function extractCpf(subjectRaw: string): string | null {
   // Pattern: explicit CPF label
   const cpfMatch = subjectRaw.match(/CPF[:\s=]+(\d{11})/i);
   if (cpfMatch?.[1]) return cpfMatch[1];

   return null;
}

// =============================================================================
// Cross-Platform Base64 Helpers
// =============================================================================

/**
 * Convert a base64 string to a Uint8Array.
 * Uses Buffer in Node/Bun for performance; falls back to atob in browsers.
 */
export function base64ToBytes(b64: string): Uint8Array {
   if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
      return new Uint8Array(Buffer.from(b64, "base64"));
   }
   const binary = atob(b64);
   const bytes = new Uint8Array(binary.length);
   for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
   return bytes;
}

/**
 * Convert a Uint8Array to a base64 string.
 * Uses Buffer in Node/Bun for performance; falls back to btoa in browsers.
 */
export function bytesToBase64(bytes: Uint8Array): string {
   if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
      return Buffer.from(bytes).toString("base64");
   }
   let binary = "";
   for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
   return btoa(binary);
}

// =============================================================================
// PEM Helpers
// =============================================================================

/** Convert DER bytes to PEM string with given label */
export function derToPem(der: Uint8Array, label: string): string {
   const b64 = bytesToBase64(der);
   const lines: string[] = [];
   for (let i = 0; i < b64.length; i += 64) {
      lines.push(b64.slice(i, i + 64));
   }
   return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

/** Extract base64 content from PEM string (strips headers/whitespace) */
export function pemToBase64(pem: string): string {
   return pem
      .replace(/-----BEGIN [^-]+-----/, "")
      .replace(/-----END [^-]+-----/, "")
      .replace(/\s+/g, "");
}

// =============================================================================
// XML-DSig Constants
// =============================================================================

export const XMLDSIG_NS = "http://www.w3.org/2000/09/xmldsig#";
export const EXC_C14N_NS = "http://www.w3.org/2001/10/xml-exc-c14n#";

export const DIGEST_ALGORITHMS = {
   sha1: {
      uri: "http://www.w3.org/2000/09/xmldsig#sha1",
      nodeAlgo: "sha1",
   },
   sha256: {
      uri: "http://www.w3.org/2001/04/xmlenc#sha256",
      nodeAlgo: "sha256",
   },
} as const;

export const SIGNATURE_ALGORITHMS = {
   sha1: {
      uri: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
      nodeAlgo: "sha1",
   },
   sha256: {
      uri: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
      nodeAlgo: "sha256",
   },
} as const;

export const TRANSFORM_ALGORITHMS = {
   envelopedSignature: "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
   excC14n: "http://www.w3.org/2001/10/xml-exc-c14n#",
} as const;
