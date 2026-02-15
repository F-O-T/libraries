/**
 * Certificate Parser — Parse and manage Brazilian A1 digital certificates
 *
 * Handles .pfx/.p12 files using @f-o-t/crypto for PFX extraction
 * and X.509 parsing (pure JavaScript, works in Bun without OpenSSL).
 */

import { parsePkcs12, derToPem } from "@f-o-t/crypto";
import { parseX509Certificate } from "./x509.ts";
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
 * @param pfx - The PFX/P12 file contents as a Buffer
 * @param password - The password to decrypt the PFX file
 * @returns Parsed certificate information
 * @throws {Error} If the PFX cannot be parsed or the password is wrong
 */
export function parseCertificate(
   pfx: Buffer,
   password: string,
): CertificateInfo {
   const { certPem, keyPem } = extractPemFromPfx(pfx, password);

   // Parse the X.509 certificate using pure JavaScript (no OpenSSL)
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

function extractPemFromPfx(
   pfx: Buffer,
   password: string,
): { certPem: string; keyPem: string } {
   let result;
   try {
      result = parsePkcs12(new Uint8Array(pfx), password);
   } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(
         `Failed to parse PFX: ${message}. Ensure the file is a valid PKCS#12 archive and the password is correct.`,
      );
   }

   const certPem = derToPem(result.certificate, "CERTIFICATE");
   const keyPem = derToPem(result.privateKey, "PRIVATE KEY");

   if (!certPem.includes("-----BEGIN CERTIFICATE-----")) {
      throw new Error(
         "Failed to extract certificate from PFX. Ensure the file is a valid PKCS#12 archive and the password is correct.",
      );
   }

   if (
      !keyPem.includes("-----BEGIN PRIVATE KEY-----") &&
      !keyPem.includes("-----BEGIN RSA PRIVATE KEY-----")
   ) {
      throw new Error(
         "Failed to extract private key from PFX. Ensure the file is a valid PKCS#12 archive and the password is correct.",
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
