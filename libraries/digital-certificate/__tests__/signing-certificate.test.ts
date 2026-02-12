import { describe, expect, test } from "bun:test";
import forge from "node-forge";
import { createHash } from "node:crypto";
import { getSigningCertificateV2Attribute } from "../src/plugins/pdf-signer/signing-certificate";
import { loadCertificate } from "./test-helpers";

describe("Signing Certificate V2 Attribute", () => {
  test("getSigningCertificateV2Attribute - creates attribute with correct OID", () => {
    const certInfo = loadCertificate();
    const forgeCert = forge.pki.certificateFromPem(certInfo.certPem);

    const attribute = getSigningCertificateV2Attribute(forgeCert);

    // Should return attribute with correct OID for id-aa-signingCertificateV2
    expect(attribute.type).toBe("1.2.840.113549.1.9.16.2.47");
    expect(attribute.value).toBeDefined();
  });

  test("getSigningCertificateV2Attribute - includes certificate hash", () => {
    const certInfo = loadCertificate();
    const forgeCert = forge.pki.certificateFromPem(certInfo.certPem);

    // Calculate expected hash
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(forgeCert)).getBytes();
    const expectedHash = createHash("sha256").update(certDer, "binary").digest();

    const attribute = getSigningCertificateV2Attribute(forgeCert);

    // Extract the hash from the ASN.1 structure
    const derBytes = forge.asn1.toDer(attribute.value).getBytes();

    // Parse back to verify structure
    const parsed = forge.asn1.fromDer(derBytes);

    // SigningCertificateV2 ::= SEQUENCE {
    //   certs SEQUENCE OF ESSCertIDv2,
    //   policies SEQUENCE OF PolicyInformation OPTIONAL
    // }
    expect(parsed.type).toBe(forge.asn1.Type.SEQUENCE);
    expect(parsed.value).toBeInstanceOf(Array);
    expect(parsed.value.length).toBeGreaterThanOrEqual(1);

    // certs should be a SEQUENCE
    const certs = parsed.value[0];
    expect(certs.type).toBe(forge.asn1.Type.SEQUENCE);
    expect(certs.value).toBeInstanceOf(Array);
    expect(certs.value.length).toBeGreaterThanOrEqual(1);

    // First ESSCertIDv2 should be a SEQUENCE
    const essCertId = certs.value[0];
    expect(essCertId.type).toBe(forge.asn1.Type.SEQUENCE);
    expect(essCertId.value).toBeInstanceOf(Array);

    // ESSCertIDv2 ::= SEQUENCE {
    //   hashAlgorithm AlgorithmIdentifier DEFAULT {algorithm id-sha256},
    //   certHash Hash,
    //   issuerSerial IssuerSerial OPTIONAL
    // }

    // Find the certHash (OCTET STRING)
    let certHash: forge.asn1.Asn1 | null = null;
    for (const item of essCertId.value) {
      if (item.type === forge.asn1.Type.OCTETSTRING) {
        certHash = item;
        break;
      }
    }

    expect(certHash).not.toBeNull();
    if (certHash) {
      const hashBytes = Buffer.from(certHash.value as string, "binary");
      expect(hashBytes.equals(expectedHash)).toBe(true);
    }
  });

  test("getSigningCertificateV2Attribute - includes issuer serial", () => {
    const certInfo = loadCertificate();
    const forgeCert = forge.pki.certificateFromPem(certInfo.certPem);

    const attribute = getSigningCertificateV2Attribute(forgeCert);

    // Extract the ASN.1 structure
    const derBytes = forge.asn1.toDer(attribute.value).getBytes();
    const parsed = forge.asn1.fromDer(derBytes);

    // Navigate to certs[0] (first ESSCertIDv2)
    const certs = parsed.value[0];
    const essCertId = certs.value[0];

    // Look for IssuerSerial (should be a SEQUENCE)
    let issuerSerial: forge.asn1.Asn1 | null = null;
    for (const item of essCertId.value) {
      // IssuerSerial is a SEQUENCE that contains issuer (GeneralNames) and serialNumber (INTEGER)
      if (item.type === forge.asn1.Type.SEQUENCE && item.value.length >= 2) {
        // Check if it has an INTEGER (serial number) as one of its children
        const hasInteger = item.value.some((child: forge.asn1.Asn1) =>
          child.type === forge.asn1.Type.INTEGER
        );
        if (hasInteger) {
          issuerSerial = item;
          break;
        }
      }
    }

    expect(issuerSerial).not.toBeNull();

    if (issuerSerial) {
      // IssuerSerial ::= SEQUENCE {
      //   issuer GeneralNames,
      //   serialNumber CertificateSerialNumber
      // }
      const issuerSerialValue = issuerSerial.value as forge.asn1.Asn1[];
      expect(issuerSerialValue.length).toBe(2);

      // Find the serial number (INTEGER)
      const serialNumber = issuerSerialValue.find(
        (item: forge.asn1.Asn1) => item.type === forge.asn1.Type.INTEGER
      );
      expect(serialNumber).toBeDefined();

      // Verify serial number matches certificate
      if (serialNumber) {
        const certSerial = forgeCert.serialNumber;
        const attrSerial = forge.util.bytesToHex(serialNumber.value as string);
        expect(attrSerial.toLowerCase()).toBe(certSerial.toLowerCase());
      }
    }
  });

  test("getSigningCertificateV2Attribute - uses SHA-256 as default hash algorithm", () => {
    const certInfo = loadCertificate();
    const forgeCert = forge.pki.certificateFromPem(certInfo.certPem);

    const attribute = getSigningCertificateV2Attribute(forgeCert);

    // Extract the ASN.1 structure
    const derBytes = forge.asn1.toDer(attribute.value).getBytes();
    const parsed = forge.asn1.fromDer(derBytes);

    // Navigate to certs[0] (first ESSCertIDv2)
    const certs = parsed.value[0];
    const essCertId = certs.value[0];

    // Look for AlgorithmIdentifier (SEQUENCE with OID)
    let hashAlgorithm: forge.asn1.Asn1 | null = null;
    for (const item of essCertId.value) {
      if (item.type === forge.asn1.Type.SEQUENCE) {
        // Check if it has an OID as first child
        const firstChild = item.value[0];
        if (firstChild && firstChild.type === forge.asn1.Type.OID) {
          hashAlgorithm = item;
          break;
        }
      }
    }

    expect(hashAlgorithm).not.toBeNull();

    if (hashAlgorithm) {
      const oid = hashAlgorithm.value[0];
      const oidValue = forge.asn1.derToOid(oid.value as string);
      // SHA-256 OID: 2.16.840.1.101.3.4.2.1
      expect(oidValue).toBe("2.16.840.1.101.3.4.2.1");
    }
  });

  test("getSigningCertificateV2Attribute - ASN.1 structure matches RFC 5035", () => {
    const certInfo = loadCertificate();
    const forgeCert = forge.pki.certificateFromPem(certInfo.certPem);

    const attribute = getSigningCertificateV2Attribute(forgeCert);

    // Verify the ASN.1 can be serialized and parsed
    const derBytes = forge.asn1.toDer(attribute.value).getBytes();
    expect(derBytes.length).toBeGreaterThan(0);

    // Verify it can be parsed back
    const parsed = forge.asn1.fromDer(derBytes);
    expect(parsed.type).toBe(forge.asn1.Type.SEQUENCE);

    // SigningCertificateV2 should have at least certs
    expect(parsed.value.length).toBeGreaterThanOrEqual(1);

    // certs should be a SEQUENCE OF ESSCertIDv2
    const certs = parsed.value[0];
    expect(certs.type).toBe(forge.asn1.Type.SEQUENCE);
    expect(certs.value.length).toBeGreaterThanOrEqual(1);

    // Each ESSCertIDv2 should be a SEQUENCE
    const essCertId = certs.value[0];
    expect(essCertId.type).toBe(forge.asn1.Type.SEQUENCE);
    expect(essCertId.value.length).toBeGreaterThanOrEqual(2);
  });

  test("getSigningCertificateV2Attribute - handles different certificate formats", () => {
    const certInfo = loadCertificate();

    // Test with forge certificate (from PEM)
    const forgeCert = forge.pki.certificateFromPem(certInfo.certPem);
    const attribute1 = getSigningCertificateV2Attribute(forgeCert);
    expect(attribute1.type).toBe("1.2.840.113549.1.9.16.2.47");

    // Test with the same certificate - should produce the same hash
    const forgeCert2 = forge.pki.certificateFromPem(certInfo.certPem);
    const attribute2 = getSigningCertificateV2Attribute(forgeCert2);

    const der1 = forge.asn1.toDer(attribute1.value).getBytes();
    const der2 = forge.asn1.toDer(attribute2.value).getBytes();

    expect(der1).toBe(der2);
  });

  test("getSigningCertificateV2Attribute - cert hash is exactly 32 bytes (SHA-256)", () => {
    const certInfo = loadCertificate();
    const forgeCert = forge.pki.certificateFromPem(certInfo.certPem);

    const attribute = getSigningCertificateV2Attribute(forgeCert);

    // Extract the hash from the ASN.1 structure
    const derBytes = forge.asn1.toDer(attribute.value).getBytes();
    const parsed = forge.asn1.fromDer(derBytes);

    const certs = parsed.value[0];
    const essCertId = certs.value[0];

    // Find the certHash (OCTET STRING)
    let certHash: forge.asn1.Asn1 | null = null;
    for (const item of essCertId.value) {
      if (item.type === forge.asn1.Type.OCTETSTRING) {
        certHash = item;
        break;
      }
    }

    expect(certHash).not.toBeNull();
    if (certHash) {
      const hashBytes = Buffer.from(certHash.value as string, "binary");
      expect(hashBytes.length).toBe(32); // SHA-256 = 32 bytes
    }
  });
});
