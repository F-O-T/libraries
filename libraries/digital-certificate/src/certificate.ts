/**
 * Certificate Parser — Parse and manage Brazilian A1 digital certificates
 *
 * Handles .pfx/.p12 files using @f-o-t/crypto for PFX extraction
 * and X.509 parsing (pure JavaScript, works in Bun without OpenSSL).
 */

import { parsePkcs12, derToPem } from "@f-o-t/crypto";
import { parseX509Certificate } from "./x509.ts";
import { CertificateParseError, classifyPkcs12Error } from "./errors.ts";
import type {
   BrazilianFields,
   CertificateInfo,
   CertificateIssuer,
   CertificateSubject,
   CertificateValidity,
} from "./types.ts";
import { extractCnpj, extractCpf, parseDistinguishedName } from "./utils.ts";

// =============================================================================
// Public API
// =============================================================================

/**
 * Parse a .pfx/.p12 certificate file and extract all relevant information
 *
 * @param pfx - The PFX/P12 file contents as a Uint8Array
 * @param password - The password to decrypt the PFX file
 * @returns Parsed certificate information
 * @throws {CertificateParseError} With a structured `code` field for programmatic handling
 */
export async function parseCertificate(
   pfx: Uint8Array,
   password: string,
): Promise<CertificateInfo> {
   // --- Input validation ---
   if (!pfx || pfx.length === 0) {
      throw new CertificateParseError(
         "EMPTY_FILE",
         "Certificate file is empty (0 bytes). Ensure the file was uploaded correctly.",
      );
   }

   if (!isLikelyPkcs12(pfx)) {
      const detectedType = detectFileType(pfx);
      throw new CertificateParseError(
         "INVALID_FORMAT",
         `The file does not appear to be a PKCS#12 (.pfx/.p12) certificate${detectedType ? ` (detected: ${detectedType})` : ""}. Expected a .pfx or .p12 file.`,
      );
   }

   // --- PFX extraction ---
   const { certPem, keyPem } = await extractPemFromPfx(pfx, password);

   // --- X.509 parsing ---
   let x509;
   try {
      x509 = parseX509Certificate(certPem);
   } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      throw new CertificateParseError(
         "X509_PARSE_FAILED",
         `Certificate was extracted from PFX but X.509 parsing failed: ${message}`,
         { cause: e },
      );
   }

   const isValid = checkValidity(x509.validity);
   const brazilian = extractBrazilianFields(
      x509.subject.raw,
      x509.subjectAltName || undefined,
   );

   return {
      serialNumber: x509.serialNumber,
      subject: x509.subject,
      issuer: x509.issuer,
      validity: x509.validity,
      fingerprint: x509.fingerprint,
      isValid,
      brazilian,
      certPem,
      keyPem,
      pfxBuffer: pfx,
      pfxPassword: password,
   };
}

/**
 * Build CertificateInfo from already-extracted DER bytes (skips P12 parsing).
 *
 * Use this when you already have the raw certificate and private key DER
 * (e.g. from a prior `parsePkcs12` call) to avoid the expensive PBKDF2
 * key derivation a second time.
 */
export function parseCertificateFromDer(
   certDer: Uint8Array,
   keyDer: Uint8Array,
   pfx: Uint8Array,
   password: string,
): CertificateInfo {
   const certPem = derToPem(certDer, "CERTIFICATE");
   const keyPem = derToPem(keyDer, "PRIVATE KEY");

   const x509 = parseX509Certificate(certPem);

   const isValid = checkValidity(x509.validity);
   const brazilian = extractBrazilianFields(
      x509.subject.raw,
      x509.subjectAltName || undefined,
   );

   return {
      serialNumber: x509.serialNumber,
      subject: x509.subject,
      issuer: x509.issuer,
      validity: x509.validity,
      fingerprint: x509.fingerprint,
      isValid,
      brazilian,
      certPem,
      keyPem,
      pfxBuffer: pfx,
      pfxPassword: password,
   };
}

/**
 * Check if a certificate is currently valid (not expired)
 */
export function isCertificateValid(cert: CertificateInfo): boolean {
   return checkValidity(cert.validity);
}

/**
 * Get the number of days until certificate expiry
 * Returns negative if already expired
 */
export function daysUntilExpiry(cert: CertificateInfo): number {
   const now = new Date();
   const diff = cert.validity.notAfter.getTime() - now.getTime();
   return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get PEM pair (certificate + private key) from certificate info
 */
export function getPemPair(cert: CertificateInfo): {
   cert: string;
   key: string;
} {
   return { cert: cert.certPem, key: cert.keyPem };
}

// =============================================================================
// PFX Extraction via @f-o-t/crypto
// =============================================================================

async function extractPemFromPfx(
   pfx: Uint8Array,
   password: string,
): Promise<{ certPem: string; keyPem: string }> {
   let result;
   try {
      result = await parsePkcs12(pfx, password);
   } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      const { code, userMessage } = classifyPkcs12Error(message);
      throw new CertificateParseError(code, userMessage, { cause: e });
   }

   const certPem = derToPem(result.certificate, "CERTIFICATE");
   const keyPem = derToPem(result.privateKey, "PRIVATE KEY");

   if (!certPem.includes("-----BEGIN CERTIFICATE-----")) {
      throw new CertificateParseError(
         "PEM_EXTRACTION_FAILED",
         "Failed to extract certificate PEM from PFX. The file may be corrupted.",
      );
   }

   if (
      !keyPem.includes("-----BEGIN PRIVATE KEY-----") &&
      !keyPem.includes("-----BEGIN RSA PRIVATE KEY-----")
   ) {
      throw new CertificateParseError(
         "PEM_EXTRACTION_FAILED",
         "Failed to extract private key PEM from PFX. The file may be corrupted.",
      );
   }

   return { certPem: certPem.trim(), keyPem: keyPem.trim() };
}

// =============================================================================
// X.509 Parsing Helpers
// =============================================================================

function checkValidity(validity: CertificateValidity): boolean {
   const now = new Date();
   return now >= validity.notBefore && now <= validity.notAfter;
}

function extractBrazilianFields(
   subject: string,
   subjectAltName: string | undefined,
): BrazilianFields {
   let cnpj = extractCnpj(subject);
   let cpf = extractCpf(subject);

   if (subjectAltName) {
      if (!cnpj) cnpj = extractCnpj(subjectAltName);
      if (!cpf) cpf = extractCpf(subjectAltName);
   }

   return { cnpj, cpf };
}

// =============================================================================
// Input Validation Helpers
// =============================================================================

/**
 * Quick check: PKCS#12 files start with ASN.1 SEQUENCE tag (0x30).
 * This catches obviously wrong file types (images, text, zip, etc.)
 * before we attempt expensive crypto operations.
 */
function isLikelyPkcs12(data: Uint8Array): boolean {
   return data.length >= 4 && data[0] === 0x30;
}

/**
 * Best-effort file type detection for better error messages.
 */
function detectFileType(data: Uint8Array): string | null {
   if (data.length < 4) return "file too small";

   // PDF: %PDF
   if (data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46) {
      return "PDF document";
   }

   // PNG: \x89PNG
   if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
      return "PNG image";
   }

   // JPEG: \xFF\xD8\xFF
   if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
      return "JPEG image";
   }

   // ZIP / DOCX / XLSX: PK\x03\x04
   if (data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04) {
      return "ZIP archive (or Office document)";
   }

   // PEM text: -----BEGIN
   if (data[0] === 0x2d && data[1] === 0x2d && data[2] === 0x2d && data[3] === 0x2d) {
      return "PEM-encoded file (expected binary .pfx/.p12, not PEM text)";
   }

   return null;
}
