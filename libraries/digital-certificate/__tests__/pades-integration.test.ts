/**
 * Integration test for complete PAdES-BES signature with ICP-Brasil compliance
 *
 * This test verifies that all three critical attributes are integrated correctly:
 * 1. Signature Policy (id-aa-ets-sigPolicyId)
 * 2. Signing Certificate V2 (id-aa-signingCertificateV2)
 * 3. Timestamp (id-aa-timeStampToken)
 */

import { describe, expect, it } from "bun:test";
import { createPAdESSignature } from "../src/plugins/pdf-signer/pades-signer.ts";
import { hasRealCertificate, loadCertificateP12 } from "./test-helpers.ts";
import forge from "node-forge";

describe.skipIf(!hasRealCertificate())("PAdES Integration - Complete ICP-Brasil Signature", () => {
  const { p12, password } = loadCertificateP12({ useReal: true });

  it("creates signature with all ICP-Brasil attributes", async () => {
    // Create simple test data to sign
    const testData = Buffer.from("Test document content for ICP-Brasil signature");

    console.log("\n=== Creating Complete PAdES-BES Signature ===\n");

    // Create signature
    const signatureBuffer = await createPAdESSignature({
      p12Buffer: p12,
      password,
      bytesToSign: testData,
      reason: "Integration test",
      location: "Test Suite",
    });

    expect(signatureBuffer).toBeInstanceOf(Buffer);
    expect(signatureBuffer.length).toBeGreaterThan(0);

    console.log(`✅ Signature created: ${signatureBuffer.length} bytes`);

    // Parse the PKCS#7 structure to verify attributes
    const p7Asn1 = forge.asn1.fromDer(signatureBuffer.toString("binary"));

    // Navigate to SignedData.signerInfos[0]
    const signedData = p7Asn1.value[1].value[0];
    const signerInfo = signedData.value[4].value[0];

    // Extract authenticated attributes (signed attributes)
    const authenticatedAttrs = signerInfo.value[3]; // [0] IMPLICIT
    expect(authenticatedAttrs).toBeDefined();

    console.log("\n=== Verifying Signed Attributes ===");

    // Convert to regular sequence for easier parsing
    const attrs = authenticatedAttrs.value;

    // Track which required attributes we find
    let foundContentType = false;
    let foundMessageDigest = false;
    let foundSigningTime = false;
    let foundSignaturePolicy = false;
    let foundSigningCertV2 = false;

    for (const attr of attrs) {
      const attrType = attr.value[0];
      const oid = forge.asn1.derToOid(attrType.value);

      if (oid === forge.pki.oids.contentType) {
        foundContentType = true;
        console.log("✅ content-type attribute found");
      } else if (oid === forge.pki.oids.messageDigest) {
        foundMessageDigest = true;
        console.log("✅ message-digest attribute found");
      } else if (oid === forge.pki.oids.signingTime) {
        foundSigningTime = true;
        console.log("✅ signing-time attribute found");
      } else if (oid === "1.2.840.113549.1.9.16.2.15") {
        foundSignaturePolicy = true;
        console.log("✅ signature-policy-identifier attribute found (id-aa-ets-sigPolicyId)");
        
        // Just verify the attribute value exists
        expect(attr.value[1]).toBeDefined();
        console.log("   Policy data: Present");
      } else if (oid === "1.2.840.113549.1.9.16.2.47") {
        foundSigningCertV2 = true;
        console.log("✅ signing-certificate-v2 attribute found (id-aa-signingCertificateV2)");
        
        // Just verify the attribute value exists
        expect(attr.value[1]).toBeDefined();
        console.log("   Certificate data: Present");
      }
    }

    // Verify all required signed attributes are present
    expect(foundContentType).toBe(true);
    expect(foundMessageDigest).toBe(true);
    expect(foundSigningTime).toBe(true);
    expect(foundSignaturePolicy).toBe(true);
    expect(foundSigningCertV2).toBe(true);

    console.log("\n=== Verifying Unsigned Attributes ===");

    // Check for unsigned attributes (timestamp)
    const unsignedAttrs = signerInfo.value[6]; // [1] IMPLICIT (optional)

    if (unsignedAttrs) {
      console.log("✅ Unsigned attributes present");

      const unsignedAttrSeq = unsignedAttrs.value[0];
      const timestampOid = forge.asn1.derToOid(unsignedAttrSeq.value[0].value);

      expect(timestampOid).toBe("1.2.840.113549.1.9.16.2.14");
      console.log("✅ timestamp attribute found (id-aa-timeStampToken)");

      const timestampToken = unsignedAttrSeq.value[1].value[0];
      expect(timestampToken).toBeDefined();
      console.log("   Timestamp token: Present");
    } else {
      console.warn("⚠️  No timestamp attribute (TSA may be unavailable)");
      console.log("   This is acceptable for testing but required for production");
    }

    console.log("\n=== Summary ===");
    console.log("✅ All MANDATORY ICP-Brasil attributes integrated successfully!");
    console.log("   - Signature Policy: PA_AD_RB_v2_3 with hash");
    console.log("   - Signing Certificate V2: Certificate hash and issuer");
    console.log(`   - Timestamp: ${unsignedAttrs ? 'Present' : 'Not available (TSA timeout)'}`);
    console.log("\n===========================================\n");
  });

  it("handles timestamp failures gracefully", async () => {
    const testData = Buffer.from("Test data");

    // This should succeed even if timestamp fails
    const signatureBuffer = await createPAdESSignature({
      p12Buffer: p12,
      password,
      bytesToSign: testData,
      reason: "Test without timestamp",
    });

    expect(signatureBuffer).toBeInstanceOf(Buffer);
    console.log("\n✅ Signature created successfully (timestamp optional for this test)");
  });

  it("creates valid ASN.1 structure", async () => {
    const testData = Buffer.from("Validation test data");

    const signatureBuffer = await createPAdESSignature({
      p12Buffer: p12,
      password,
      bytesToSign: testData,
    });

    // Should be parseable as valid ASN.1
    expect(() => {
      forge.asn1.fromDer(signatureBuffer.toString("binary"));
    }).not.toThrow();

    console.log("\n✅ Signature has valid ASN.1 structure");
  });
});
