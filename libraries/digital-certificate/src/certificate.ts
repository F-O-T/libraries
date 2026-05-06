/**
 * Certificate Parser — Parse and manage Brazilian A1 digital certificates
 *
 * Handles .pfx/.p12 files using @f-o-t/crypto for PFX extraction
 * and X.509 parsing (pure JavaScript, works in Bun without OpenSSL).
 */

import { derToPem, parsePkcs12 } from "@f-o-t/crypto";
import { err, errAsync, ok, okAsync, ResultAsync, type Result } from "neverthrow";
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
 * @returns Parsed certificate information, or a structured parse error
 */
export function parseCertificate(
   pfx: Uint8Array,
   password: string,
): ResultAsync<CertificateInfo, CertificateParseError> {
   const validationError = validatePfxInput(pfx);
   if (validationError) return errAsync(validationError);

   return extractPemFromPfx(pfx, password).andThen(({ certPem, keyPem }) =>
      parseX509CertificateInfo(certPem, keyPem, pfx, password),
   );
}

function validatePfxInput(pfx: Uint8Array): CertificateParseError | null {
   if (!pfx || pfx.length === 0) {
      return new CertificateParseError(
         "EMPTY_FILE",
         "Certificate file is empty (0 bytes). Ensure the file was uploaded correctly.",
      );
   }

   if (!isLikelyPkcs12(pfx)) {
      const detectedType = detectFileType(pfx);
      return new CertificateParseError(
         "INVALID_FORMAT",
         `The file does not appear to be a PKCS#12 (.pfx/.p12) certificate${detectedType ? ` (detected: ${detectedType})` : ""}. Expected a .pfx or .p12 file.`,
      );
   }

   return null;
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
): Result<CertificateInfo, CertificateParseError> {
   const certPem = derToPem(certDer, "CERTIFICATE");
   const keyPem = derToPem(keyDer, "PRIVATE KEY");

   return parseX509CertificateInfoSync(certPem, keyPem, pfx, password);
}

function parseX509CertificateInfo(
   certPem: string,
   keyPem: string,
   pfx: Uint8Array,
   password: string,
): ResultAsync<CertificateInfo, CertificateParseError> {
   const result = parseX509CertificateInfoSync(certPem, keyPem, pfx, password);
   return result.isOk() ? okAsync(result.value) : errAsync(result.error);
}

function parseX509CertificateInfoSync(
   certPem: string,
   keyPem: string,
   pfx: Uint8Array,
   password: string,
): Result<CertificateInfo, CertificateParseError> {
   let x509;
   try {
      x509 = parseX509Certificate(certPem);
   } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return err(
         new CertificateParseError(
            "X509_PARSE_FAILED",
            `Certificate was extracted from PFX but X.509 parsing failed: ${message}`,
            { cause: e },
         ),
      );
   }

   const isValid = checkValidity(x509.validity);
   const brazilian = extractBrazilianFields(
      x509.subject.raw,
      x509.subjectAltName || undefined,
   );

   return ok({
      serialNumber: x509.serialNumber,
      subject: x509.subject,
      issuer: x509.issuer,
      validity: x509.validity,
      fingerprint: x509.fingerprint,
      subjectAltName: x509.subjectAltName,
      isValid,
      brazilian,
      certPem,
      keyPem,
      pfxBuffer: pfx,
      pfxPassword: password,
   });
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

function extractPemFromPfx(
   pfx: Uint8Array,
   password: string,
): ResultAsync<{ certPem: string; keyPem: string }, CertificateParseError> {
   return ResultAsync.fromPromise(parsePkcs12(pfx, password), (e: unknown) => {
      const message = e instanceof Error ? e.message : String(e);
      const { code, userMessage } = classifyPkcs12Error(message);
      return new CertificateParseError(code, userMessage, { cause: e });
   }).andThen((result) => {
      const certPem = derToPem(result.certificate, "CERTIFICATE");
      const keyPem = derToPem(result.privateKey, "PRIVATE KEY");

      if (!certPem.includes("-----BEGIN CERTIFICATE-----")) {
         return errAsync(
            new CertificateParseError(
               "PEM_EXTRACTION_FAILED",
               "Failed to extract certificate PEM from PFX. The file may be corrupted.",
            ),
         );
      }

      if (
         !keyPem.includes("-----BEGIN PRIVATE KEY-----") &&
         !keyPem.includes("-----BEGIN RSA PRIVATE KEY-----")
      ) {
         return errAsync(
            new CertificateParseError(
               "PEM_EXTRACTION_FAILED",
               "Failed to extract private key PEM from PFX. The file may be corrupted.",
            ),
         );
      }

      return okAsync({ certPem: certPem.trim(), keyPem: keyPem.trim() });
   });
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
