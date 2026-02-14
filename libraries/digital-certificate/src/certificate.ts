/**
 * Certificate Parser — Parse and manage Brazilian A1 digital certificates
 *
 * Handles .pfx/.p12 files using @f-o-t/crypto for PFX extraction
 * and Node.js crypto for X.509 parsing.
 */

import { parsePkcs12, derToPem } from "@f-o-t/crypto";
import crypto from "node:crypto";
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

   // Parse the X.509 certificate
   const x509 = new crypto.X509Certificate(certPem);

   const subject = parseSubject(x509.subject);
   const issuer = parseIssuer(x509.issuer);
   const validity = parseValidity(x509);
   const fingerprint = x509.fingerprint256.replace(/:/g, "").toLowerCase();
   const isValid = checkValidity(validity);
   const brazilian = extractBrazilianFields(x509.subject, x509.subjectAltName);

   return {
      serialNumber: x509.serialNumber,
      subject,
      issuer,
      validity,
      fingerprint,
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

function parseSubject(subjectStr: string): CertificateSubject {
   const fields = parseDistinguishedName(subjectStr);
   return {
      commonName: fields.CN ?? null,
      organization: fields.O ?? null,
      organizationalUnit: fields.OU ?? null,
      country: fields.C ?? null,
      state: fields.ST ?? null,
      locality: fields.L ?? null,
      raw: subjectStr,
   };
}

function parseIssuer(issuerStr: string): CertificateIssuer {
   const fields = parseDistinguishedName(issuerStr);
   return {
      commonName: fields.CN ?? null,
      organization: fields.O ?? null,
      country: fields.C ?? null,
      raw: issuerStr,
   };
}

function parseValidity(x509: crypto.X509Certificate): CertificateValidity {
   return {
      notBefore: new Date(x509.validFrom),
      notAfter: new Date(x509.validTo),
   };
}

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
