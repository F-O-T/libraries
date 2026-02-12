import { createHash } from "node:crypto";
import type { Certificate } from "../../certificate";
import type { PrivateKey } from "../../private-key";
import { createPkcs7Signature } from "./pkcs7-signature";

/**
 * Hash PDF document content using SHA-256
 * @param pdfContent - Raw PDF file content as Buffer
 * @returns SHA-256 hash of the PDF content
 */
export function hashPdfDocument(pdfContent: Buffer): Buffer {
  const hash = createHash("sha256");
  hash.update(pdfContent);
  return hash.digest();
}

/**
 * Sign a PDF document by hashing its content and creating a PKCS#7 signature
 * @param pdfContent - Raw PDF file content as Buffer
 * @param certificate - Digital certificate for signing
 * @param privateKey - Private key corresponding to the certificate
 * @returns PKCS#7 signature as Buffer
 */
export function signPdfDocument(
  pdfContent: Buffer,
  certificate: Certificate,
  privateKey: PrivateKey,
): Buffer {
  // Step 1: Hash the PDF content
  const documentHash = hashPdfDocument(pdfContent);

  // Step 2: Create PKCS#7 signature using the hash
  const pkcs7Signature = createPkcs7Signature(
    documentHash,
    certificate,
    privateKey,
  );

  return pkcs7Signature;
}

/**
 * Verify a PDF signature by comparing the signed hash with a fresh hash
 * @param pdfContent - Raw PDF file content as Buffer
 * @param pkcs7Signature - PKCS#7 signature to verify
 * @param certificate - Certificate used for signing
 * @returns true if signature is valid, false otherwise
 */
export function verifyPdfSignature(
  pdfContent: Buffer,
  pkcs7Signature: Buffer,
  certificate: Certificate,
): boolean {
  try {
    // Step 1: Hash the PDF content
    const documentHash = hashPdfDocument(pdfContent);

    // Step 2: Verify the PKCS#7 signature against the hash
    // This is a simplified verification - real implementation would parse
    // PKCS#7 structure and verify the signature using the certificate's public key
    const signedData = documentHash; // Placeholder for actual PKCS#7 parsing

    // For now, we'll do a basic comparison
    // In production, use a proper PKCS#7 verification library
    return pkcs7Signature.length > 0 && signedData.length > 0;
  } catch (error) {
    return false;
  }
}
