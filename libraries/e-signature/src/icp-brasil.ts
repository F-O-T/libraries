/**
 * ICP-Brasil Attributes for PAdES Signatures
 *
 * Implements the id-aa-signingCertificateV2 (RFC 5035) and
 * id-aa-ets-sigPolicyId attributes required by ICP-Brasil.
 *
 * Uses @f-o-t/asn1 for ASN.1 construction and @f-o-t/crypto for hashing.
 */

import {
   type Asn1Node,
   contextTag,
   decodeDer,
   encodeDer,
   ia5String,
   nullValue,
   octetString,
   oid,
   sequence,
} from "@f-o-t/asn1";
import { hash } from "@f-o-t/crypto";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** SHA-256 Algorithm OID */
const SHA256_OID = "2.16.840.1.101.3.4.2.1";

/** id-aa-signingCertificateV2 OID (RFC 5035) */
const SIGNING_CERTIFICATE_V2_OID = "1.2.840.113549.1.9.16.2.47";

/** id-aa-ets-sigPolicyId OID */
const SIGNATURE_POLICY_OID = "1.2.840.113549.1.9.16.2.15";

/** ICP-Brasil PAdES Policy (PA_PAdES_AD_RB_v1_1) */
const POLICY_CONFIG = {
   OID: "2.16.76.1.7.1.11.1.1",
   URL: "http://politicas.icpbrasil.gov.br/PA_PAdES_AD_RB_v1_1.der",
} as const;

/** id-spq-ets-uri OID */
const SPQ_ETS_URI_OID = "1.2.840.113549.1.9.16.5.1";

// ---------------------------------------------------------------------------
// Cached policy data
// ---------------------------------------------------------------------------

let cachedPolicyData: {
   hashAlgOid: string;
   policyHash: Uint8Array;
} | null = null;

/**
 * Clear the cached signature policy data.
 * Useful for testing or forcing a re-download.
 */
export function clearPolicyCache(): void {
   cachedPolicyData = null;
}

// ---------------------------------------------------------------------------
// Signing Certificate V2
// ---------------------------------------------------------------------------

/**
 * Build the id-aa-signingCertificateV2 attribute value (DER-encoded).
 *
 * This attribute links the signature to the specific certificate used to
 * create it, preventing substitution attacks.
 *
 * ASN.1 structure (RFC 5035):
 *
 * SigningCertificateV2 ::= SEQUENCE {
 *   certs SEQUENCE OF ESSCertIDv2
 * }
 *
 * ESSCertIDv2 ::= SEQUENCE {
 *   hashAlgorithm AlgorithmIdentifier DEFAULT {algorithm id-sha256},
 *   certHash Hash,
 *   issuerSerial IssuerSerial OPTIONAL
 * }
 *
 * IssuerSerial ::= SEQUENCE {
 *   issuer GeneralNames,
 *   serialNumber CertificateSerialNumber
 * }
 *
 * @param certDer - DER-encoded X.509 certificate
 * @returns DER-encoded SigningCertificateV2 value
 */
export function buildSigningCertificateV2(certDer: Uint8Array): Uint8Array {
   // 1. Hash the DER certificate with SHA-256
   const certHash = hash("sha256", certDer);

   // 2. Build AlgorithmIdentifier for SHA-256
   const hashAlgId = sequence(oid(SHA256_OID), nullValue());

   // 3. Extract issuer and serial number from the certificate
   const cert = decodeDer(certDer);
   const tbsCert = (cert.value as Asn1Node[])[0]!;
   const tbs = tbsCert.value as Asn1Node[];

   // version is [0] EXPLICIT, so tbs[0] may be version context tag
   let idx = 0;
   if (tbs[0]!.class === "context" && tbs[0]!.tag === 0) {
      idx = 1;
   }

   const serialNumber = tbs[idx]!; // INTEGER
   const issuerName = tbs[idx + 2]!; // Name SEQUENCE

   // 4. Build IssuerSerial
   // IssuerSerial ::= SEQUENCE { issuer GeneralNames, serialNumber INTEGER }
   // GeneralNames ::= SEQUENCE OF GeneralName
   // GeneralName ::= directoryName [4] Name
   const generalName = contextTag(4, [issuerName]);
   const generalNames = sequence(generalName);
   const issuerSerial = sequence(generalNames, serialNumber);

   // 5. Build ESSCertIDv2
   const essCertIdV2 = sequence(hashAlgId, octetString(certHash), issuerSerial);

   // 6. Build SigningCertificateV2
   const signingCertV2 = sequence(
      // certs SEQUENCE OF ESSCertIDv2
      sequence(essCertIdV2),
   );

   return encodeDer(signingCertV2);
}

// ---------------------------------------------------------------------------
// Signature Policy
// ---------------------------------------------------------------------------

/**
 * Download and parse the ICP-Brasil signature policy DER file.
 * Extracts the embedded signPolicyHash from the ASN.1 structure.
 */
async function downloadAndParsePolicyDocument(): Promise<{
   hashAlgOid: string;
   policyHash: Uint8Array;
}> {
   if (cachedPolicyData) {
      return cachedPolicyData;
   }

   const response = await fetch(POLICY_CONFIG.URL);

   if (!response.ok) {
      throw new SignaturePolicyError(
         `Failed to download signature policy: HTTP ${response.status}`,
      );
   }

   const arrayBuffer = await response.arrayBuffer();
   const data = new Uint8Array(arrayBuffer);

   if (data.length === 0 || data[0] !== 0x30) {
      throw new SignaturePolicyError("Invalid DER format in policy document");
   }

   // Parse the ASN.1 structure:
   //   SignaturePolicy ::= SEQUENCE {
   //     signPolicyHashAlg   AlgorithmIdentifier,
   //     signPolicyInfo      SignaturePolicyInfo,
   //     signPolicyHash      OCTET STRING
   //   }
   const asn1 = decodeDer(data);
   const children = asn1.value as Asn1Node[];

   if (!Array.isArray(children) || children.length < 3) {
      throw new SignaturePolicyError(
         `Unexpected policy structure: expected 3+ children, got ${children?.length}`,
      );
   }

   // Child[0] = AlgorithmIdentifier
   const algIdChildren = children[0]!.value as Asn1Node[];
   if (!Array.isArray(algIdChildren) || algIdChildren.length === 0) {
      throw new SignaturePolicyError("Invalid AlgorithmIdentifier in policy");
   }

   const { bytesToOid } = await import("@f-o-t/asn1");
   const hashAlgOid = bytesToOid(algIdChildren[0]!.value as Uint8Array);

   // Child[2] = signPolicyHash (OCTET STRING)
   const hashNode = children[2]!;
   if (hashNode.tag !== 0x04) {
      throw new SignaturePolicyError(
         `Expected OCTET STRING at child[2], got tag 0x${hashNode.tag.toString(16)}`,
      );
   }

   cachedPolicyData = {
      hashAlgOid,
      policyHash: hashNode.value as Uint8Array,
   };

   return cachedPolicyData;
}

/**
 * Build the id-aa-ets-sigPolicyId attribute value (DER-encoded).
 *
 * Downloads the ICP-Brasil PAdES signature policy and extracts the
 * embedded signPolicyHash to build the attribute.
 *
 * @returns DER-encoded SignaturePolicyIdentifier value
 */
export async function buildSignaturePolicy(): Promise<Uint8Array> {
   const { hashAlgOid, policyHash } = await downloadAndParsePolicyDocument();

   // AlgorithmIdentifier for hash (no NULL — matches policy encoding)
   const hashAlgId = sequence(oid(hashAlgOid));

   // SigPolicyHash (OtherHashAlgAndValue)
   const sigPolicyHash = sequence(hashAlgId, octetString(policyHash));

   // SigPolicyQualifiers with policy URL
   const sigPolicyQualifiers = sequence(
      sequence(
         // id-spq-ets-uri
         oid(SPQ_ETS_URI_OID),
         // Policy URL as IA5String
         ia5String(POLICY_CONFIG.URL),
      ),
   );

   // SignaturePolicyId
   const signaturePolicyId = sequence(
      // sigPolicyId (policy OID)
      oid(POLICY_CONFIG.OID),
      // sigPolicyHash
      sigPolicyHash,
      // sigPolicyQualifiers
      sigPolicyQualifiers,
   );

   return encodeDer(signaturePolicyId);
}

/**
 * Attribute OID constants for external use
 */
export const ICP_BRASIL_OIDS = {
   signingCertificateV2: SIGNING_CERTIFICATE_V2_OID,
   signaturePolicy: SIGNATURE_POLICY_OID,
} as const;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class SignaturePolicyError extends Error {
   constructor(message: string) {
      super(message);
      this.name = "SignaturePolicyError";
   }
}
