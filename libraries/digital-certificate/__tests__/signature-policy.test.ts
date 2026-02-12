import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test";
import forge from "node-forge";
import { createHash } from "node:crypto";
import * as signaturePolicy from "../src/plugins/pdf-signer/signature-policy";

describe("Signature Policy", () => {
  // Clear cache before each test to ensure isolation
  beforeEach(() => {
    signaturePolicy.clearCache();
  });

  describe("getSignaturePolicyAttribute", () => {
    it("should download policy document and create attribute", async () => {
      const attribute = await signaturePolicy.getSignaturePolicyAttribute();

      // Check that attribute has correct OID
      expect(attribute.type).toBe("1.2.840.113549.1.9.16.2.15");

      // Check that attribute value is ASN.1 structure
      expect(attribute.value).toBeDefined();
      expect(attribute.value.tagClass).toBe(forge.asn1.Class.UNIVERSAL);
      expect(attribute.value.type).toBe(forge.asn1.Type.SEQUENCE);

      // Verify structure has expected components
      expect(attribute.value.value).toBeDefined();
      expect(Array.isArray(attribute.value.value)).toBe(true);
      expect(attribute.value.value.length).toBeGreaterThan(0);
    });

    it("should include ICP-Brasil policy OID", async () => {
      const attribute = await signaturePolicy.getSignaturePolicyAttribute();

      // Convert to DER and check for policy OID
      const der = forge.asn1.toDer(attribute.value);
      const derHex = forge.util.bytesToHex(der.getBytes());

      // Policy OID 2.16.76.1.7.1.1.2.3 in hex format
      // This is the PA_AD_RB_v2_3 policy identifier
      expect(derHex).toContain("604c010701010203");
    });

    it("should include SHA-256 hash of policy document", async () => {
      const attribute = await signaturePolicy.getSignaturePolicyAttribute();

      // The attribute should contain a hash value
      const der = forge.asn1.toDer(attribute.value);
      const derBytes = der.getBytes();

      // Should contain SHA-256 hash (32 bytes = 64 hex chars)
      expect(derBytes.length).toBeGreaterThan(32);
    });

    it("should cache policy document to avoid repeated downloads", async () => {
      // First call - download and cache
      await signaturePolicy.downloadPolicyDocument();

      // Get reference to first document
      const doc1 = await signaturePolicy.downloadPolicyDocument();

      // Second call - should return same cached instance
      const doc2 = await signaturePolicy.downloadPolicyDocument();

      // Should be the exact same buffer reference (cached)
      expect(doc1).toBe(doc2);
    });

    it("should handle network errors gracefully", async () => {
      // Clear cache first
      signaturePolicy.clearCache();

      // Mock fetch to simulate network error
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(async () => {
        throw new Error("Network error");
      }) as any;

      try {
        await expect(
          signaturePolicy.getSignaturePolicyAttribute()
        ).rejects.toThrow("Failed to download signature policy");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("should handle invalid response (non-200)", async () => {
      // Clear cache first
      signaturePolicy.clearCache();

      // Mock fetch to return 404
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(async () => {
        return new Response(null, { status: 404, statusText: "Not Found" });
      }) as any;

      try {
        await expect(
          signaturePolicy.getSignaturePolicyAttribute()
        ).rejects.toThrow("Failed to download signature policy");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("downloadPolicyDocument", () => {
    it("should download policy document from ICP-Brasil", async () => {
      const doc = await signaturePolicy.downloadPolicyDocument();

      expect(doc).toBeInstanceOf(Buffer);
      expect(doc.length).toBeGreaterThan(0);

      // DER files typically start with 0x30 (SEQUENCE)
      expect(doc[0]).toBe(0x30);
    });

    it("should return cached document on subsequent calls", async () => {
      const doc1 = await signaturePolicy.downloadPolicyDocument();
      const doc2 = await signaturePolicy.downloadPolicyDocument();

      // Should be the exact same buffer reference (cached)
      expect(doc1).toBe(doc2);
    });
  });

  describe("calculatePolicyHash", () => {
    it("should calculate SHA-256 hash of policy document", async () => {
      const doc = Buffer.from("test policy document");
      const hash = signaturePolicy.calculatePolicyHash(doc);

      expect(hash).toBeInstanceOf(Buffer);
      expect(hash.length).toBe(32); // SHA-256 = 32 bytes

      // Verify hash is correct
      const expectedHash = createHash("sha256").update(doc).digest();
      expect(hash.equals(expectedHash)).toBe(true);
    });

    it("should produce consistent hashes for same input", () => {
      const doc = Buffer.from("consistent input");
      const hash1 = signaturePolicy.calculatePolicyHash(doc);
      const hash2 = signaturePolicy.calculatePolicyHash(doc);

      expect(hash1.equals(hash2)).toBe(true);
    });

    it("should produce different hashes for different inputs", () => {
      const doc1 = Buffer.from("input 1");
      const doc2 = Buffer.from("input 2");

      const hash1 = signaturePolicy.calculatePolicyHash(doc1);
      const hash2 = signaturePolicy.calculatePolicyHash(doc2);

      expect(hash1.equals(hash2)).toBe(false);
    });
  });

  describe("clearCache", () => {
    it("should clear cached policy document", async () => {
      // Download first time
      const doc1 = await signaturePolicy.downloadPolicyDocument();

      // Clear cache
      signaturePolicy.clearCache();

      // Download again - should fetch from network
      const doc2 = await signaturePolicy.downloadPolicyDocument();

      // Content should be same but different buffer instance
      expect(doc1.equals(doc2)).toBe(true);
      expect(doc1 === doc2).toBe(false);
    });
  });

  describe("ASN.1 Structure Validation", () => {
    it("should create properly formatted SignaturePolicyIdentifier", async () => {
      const attribute = await signaturePolicy.getSignaturePolicyAttribute();

      // Parse the ASN.1 structure
      const asn1Value = attribute.value;

      // Top level should be SEQUENCE
      expect(asn1Value.tagClass).toBe(forge.asn1.Class.UNIVERSAL);
      expect(asn1Value.type).toBe(forge.asn1.Type.SEQUENCE);

      // Should have at least one element (SignaturePolicyId)
      expect(Array.isArray(asn1Value.value)).toBe(true);
      expect(asn1Value.value.length).toBeGreaterThanOrEqual(1);

      // First element should be SEQUENCE (SignaturePolicyId)
      const sigPolicyId = asn1Value.value[0];
      expect(sigPolicyId.tagClass).toBe(forge.asn1.Class.UNIVERSAL);
      expect(sigPolicyId.type).toBe(forge.asn1.Type.SEQUENCE);
    });

    it("should include AlgorithmIdentifier for SHA-256", async () => {
      const attribute = await signaturePolicy.getSignaturePolicyAttribute();

      // Convert to DER for inspection
      const der = forge.asn1.toDer(attribute.value);
      const derHex = forge.util.bytesToHex(der.getBytes());

      // SHA-256 OID: 2.16.840.1.101.3.4.2.1
      // In hex: 60 86 48 01 65 03 04 02 01
      expect(derHex).toContain("608648016503040201");
    });
  });

  describe("Integration with ICP-Brasil Policy", () => {
    it("should work with actual ICP-Brasil policy document", async () => {
      // This test actually downloads from ICP-Brasil server
      const attribute = await signaturePolicy.getSignaturePolicyAttribute();

      // Verify the complete structure
      expect(attribute.type).toBe("1.2.840.113549.1.9.16.2.15");
      expect(attribute.value).toBeDefined();

      // Should be able to serialize to DER without errors
      const der = forge.asn1.toDer(attribute.value);
      expect(der.length()).toBeGreaterThan(0);

      // Verify it contains both policy OID and hash
      const derHex = forge.util.bytesToHex(der.getBytes());
      expect(derHex).toContain("604c010701010203"); // Policy OID
      expect(derHex).toContain("608648016503040201"); // SHA-256 OID
    });
  });
});
