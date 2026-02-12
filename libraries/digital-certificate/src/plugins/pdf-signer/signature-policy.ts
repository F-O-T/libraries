/**
 * ICP-Brasil Signature Policy Module
 *
 * Handles downloading and hashing of the ICP-Brasil signature policy document
 * and creates the id-aa-ets-sigPolicyId attribute for PAdES signatures.
 *
 * The signature policy identifier is a REQUIRED attribute for ICP-Brasil
 * compliant signatures and must include:
 * 1. The policy OID (2.16.76.1.7.1.1.2.3 for PA_AD_RB_v2_3)
 * 2. The SHA-256 hash of the policy document
 * 3. The hash algorithm identifier
 */

import forge from "node-forge";
import { createHash } from "node:crypto";

/**
 * ICP-Brasil Signature Policy Configuration
 */
const POLICY_CONFIG = {
  // PA_AD_RB_v2_3 - Política de Assinatura Digital da ICP-Brasil v2.3
  OID: "2.16.76.1.7.1.1.2.3",
  URL: "http://politicas.icpbrasil.gov.br/PA_AD_RB_v2_3.der",
  // Attribute OID: id-aa-ets-sigPolicyId
  ATTRIBUTE_OID: "1.2.840.113549.1.9.16.2.15",
} as const;

/**
 * SHA-256 Algorithm Identifier OID
 */
const SHA256_OID = "2.16.840.1.101.3.4.2.1";

/**
 * Cache for the downloaded policy document
 */
let cachedPolicyDocument: Buffer | null = null;

/**
 * Download the ICP-Brasil signature policy document
 * @returns Policy document as Buffer
 * @throws Error if download fails
 */
export async function downloadPolicyDocument(): Promise<Buffer> {
  // Return cached document if available
  if (cachedPolicyDocument) {
    return cachedPolicyDocument;
  }

  try {
    const response = await fetch(POLICY_CONFIG.URL);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate that it's a DER file (should start with 0x30 for SEQUENCE)
    if (buffer.length === 0 || buffer[0] !== 0x30) {
      throw new Error("Invalid DER format");
    }

    // Cache the document
    cachedPolicyDocument = buffer;

    return buffer;
  } catch (error) {
    throw new Error(
      `Failed to download signature policy: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Calculate SHA-256 hash of policy document
 * @param policyDocument - The policy document buffer
 * @returns SHA-256 hash as Buffer
 */
export function calculatePolicyHash(policyDocument: Buffer): Buffer {
  return createHash("sha256").update(policyDocument).digest();
}

/**
 * Clear the cached policy document
 * Useful for testing or forcing a re-download
 */
export function clearCache(): void {
  cachedPolicyDocument = null;
}

/**
 * Create the id-aa-ets-sigPolicyId attribute for PAdES signatures
 *
 * ASN.1 Structure:
 * SignaturePolicyIdentifier ::= SEQUENCE {
 *   signaturePolicyId   SignaturePolicyId,
 *   signaturePolicyHash SignaturePolicyHash OPTIONAL
 * }
 *
 * SignaturePolicyId ::= SEQUENCE {
 *   sigPolicyId          OBJECT IDENTIFIER,
 *   sigPolicyHash        SigPolicyHash,
 *   sigPolicyQualifiers  SigPolicyQualifiers OPTIONAL
 * }
 *
 * SigPolicyHash ::= SEQUENCE {
 *   hashAlgorithm    AlgorithmIdentifier,
 *   hashValue        OCTET STRING
 * }
 *
 * @returns Signature policy attribute ready for PKCS#7 signed attributes
 */
export async function getSignaturePolicyAttribute(): Promise<{
  type: string;
  value: forge.asn1.Asn1;
}> {
  // Download and hash the policy document
  const policyDocument = await downloadPolicyDocument();
  const policyHash = calculatePolicyHash(policyDocument);

  // Create AlgorithmIdentifier for SHA-256
  // AlgorithmIdentifier ::= SEQUENCE {
  //   algorithm    OBJECT IDENTIFIER,
  //   parameters   ANY DEFINED BY algorithm OPTIONAL
  // }
  const hashAlgorithmIdentifier = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      // SHA-256 OID
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.OID,
        false,
        forge.asn1.oidToDer(SHA256_OID).getBytes()
      ),
      // NULL parameters for SHA-256
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.NULL,
        false,
        ""
      ),
    ]
  );

  // Create SigPolicyHash
  const sigPolicyHash = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      // hashAlgorithm
      hashAlgorithmIdentifier,
      // hashValue
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.OCTETSTRING,
        false,
        policyHash.toString("binary")
      ),
    ]
  );

  // Create SignaturePolicyId
  const signaturePolicyId = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      // sigPolicyId (OID of the policy)
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.OID,
        false,
        forge.asn1.oidToDer(POLICY_CONFIG.OID).getBytes()
      ),
      // sigPolicyHash
      sigPolicyHash,
      // sigPolicyQualifiers is OPTIONAL - we omit it
    ]
  );

  // Create SignaturePolicyIdentifier (top level)
  const signaturePolicyIdentifier = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [signaturePolicyId]
  );

  // Return as attribute
  return {
    type: POLICY_CONFIG.ATTRIBUTE_OID,
    value: signaturePolicyIdentifier,
  };
}
