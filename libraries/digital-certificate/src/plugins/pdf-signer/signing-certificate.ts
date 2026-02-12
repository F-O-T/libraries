/**
 * ICP-Brasil Signing Certificate V2 Attribute
 *
 * Implements the id-aa-signingCertificateV2 attribute (RFC 5035) required by ICP-Brasil.
 * This attribute contains the SHA-256 hash of the signing certificate and links
 * the signature to the certificate used to create it.
 *
 * This is a MANDATORY attribute for ICP-Brasil PAdES signatures and prevents
 * substitution attacks where someone could claim a signature was created by
 * a different certificate.
 */

import forge from "node-forge";
import { createHash } from "node:crypto";

/**
 * OID for id-aa-signingCertificateV2 (RFC 5035)
 */
const SIGNING_CERTIFICATE_V2_OID = "1.2.840.113549.1.9.16.2.47";

/**
 * SHA-256 Algorithm Identifier OID
 */
const SHA256_OID = "2.16.840.1.101.3.4.2.1";

/**
 * Create the id-aa-signingCertificateV2 attribute for PAdES signatures
 *
 * ASN.1 Structure (RFC 5035):
 *
 * SigningCertificateV2 ::= SEQUENCE {
 *   certs SEQUENCE OF ESSCertIDv2,
 *   policies SEQUENCE OF PolicyInformation OPTIONAL
 * }
 *
 * ESSCertIDv2 ::= SEQUENCE {
 *   hashAlgorithm AlgorithmIdentifier DEFAULT {algorithm id-sha256},
 *   certHash Hash,
 *   issuerSerial IssuerSerial OPTIONAL
 * }
 *
 * Hash ::= OCTET STRING
 *
 * IssuerSerial ::= SEQUENCE {
 *   issuer GeneralNames,
 *   serialNumber CertificateSerialNumber
 * }
 *
 * @param certificate - Forge certificate object
 * @returns Signing certificate V2 attribute ready for PKCS#7 signed attributes
 */
export function getSigningCertificateV2Attribute(
  certificate: forge.pki.Certificate
): {
  type: string;
  value: forge.asn1.Asn1;
} {
  // Step 1: Calculate SHA-256 hash of the certificate (DER format)
  const certAsn1 = forge.pki.certificateToAsn1(certificate);
  const certDer = forge.asn1.toDer(certAsn1).getBytes();
  const certHash = createHash("sha256").update(certDer, "binary").digest();

  // Step 2: Create AlgorithmIdentifier for SHA-256
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

  // Step 3: Create IssuerSerial
  // IssuerSerial ::= SEQUENCE {
  //   issuer GeneralNames,
  //   serialNumber CertificateSerialNumber
  // }
  //
  // GeneralNames ::= SEQUENCE OF GeneralName
  // GeneralName ::= CHOICE {
  //   ...
  //   directoryName [4] Name,
  //   ...
  // }

  // Convert issuer to GeneralNames (directoryName format)
  const issuerAsn1 = certificate.issuer;

  // Create GeneralName with directoryName (context-specific tag [4])
  const generalName = forge.asn1.create(
    forge.asn1.Class.CONTEXT_SPECIFIC,
    4, // directoryName tag
    true,
    [forge.pki.distinguishedNameToAsn1(issuerAsn1)]
  );

  // Create GeneralNames (SEQUENCE OF GeneralName)
  const generalNames = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [generalName]
  );

  // Get serial number as INTEGER
  const serialNumberHex = certificate.serialNumber;
  const serialNumberBytes = forge.util.hexToBytes(serialNumberHex);

  const issuerSerial = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      // issuer (GeneralNames)
      generalNames,
      // serialNumber (INTEGER)
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.INTEGER,
        false,
        serialNumberBytes
      ),
    ]
  );

  // Step 4: Create ESSCertIDv2
  // ESSCertIDv2 ::= SEQUENCE {
  //   hashAlgorithm AlgorithmIdentifier DEFAULT {algorithm id-sha256},
  //   certHash Hash,
  //   issuerSerial IssuerSerial OPTIONAL
  // }
  const essCertIdV2 = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      // hashAlgorithm
      hashAlgorithmIdentifier,
      // certHash (OCTET STRING)
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.OCTETSTRING,
        false,
        certHash.toString("binary")
      ),
      // issuerSerial
      issuerSerial,
    ]
  );

  // Step 5: Create SigningCertificateV2
  // SigningCertificateV2 ::= SEQUENCE {
  //   certs SEQUENCE OF ESSCertIDv2,
  //   policies SEQUENCE OF PolicyInformation OPTIONAL
  // }
  const signingCertificateV2 = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      // certs (SEQUENCE OF ESSCertIDv2)
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        [essCertIdV2]
      ),
      // policies is OPTIONAL - we omit it
    ]
  );

  // Return as attribute
  return {
    type: SIGNING_CERTIFICATE_V2_OID,
    value: signingCertificateV2,
  };
}
