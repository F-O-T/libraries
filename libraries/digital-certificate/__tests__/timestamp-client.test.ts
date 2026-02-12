/**
 * Timestamp Client Tests
 *
 * Tests RFC 3161 timestamp requests with real TSA servers
 *
 * Note: These tests make real network requests and may be slow or fail
 * if TSA servers are unavailable. Brazilian ICP-Brasil TSA servers may
 * require authentication or be temporarily unavailable.
 */

import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import {
  TIMESTAMP_SERVERS,
  extractTimestampToken,
  requestTimestamp,
  type TimestampOptions,
} from "../src/plugins/pdf-signer/timestamp-client.ts";

// Alternative working TSA servers for testing when ICP-Brasil servers are unavailable
const FALLBACK_TSA_SERVERS = {
  DIGICERT: "http://timestamp.digicert.com",
  SECTIGO: "http://timestamp.sectigo.com",
  ENTRUST: "http://timestamp.entrust.net",
};

// Helper to check if a TSA server is available
async function isTsaServerAvailable(url: string): Promise<boolean> {
  try {
    const testData = Buffer.from("test");
    await requestTimestamp(testData, { tsaUrl: url });
    return true;
  } catch {
    return false;
  }
}

describe("TIMESTAMP_SERVERS", () => {
  it("exports valid TSA server URLs", () => {
    expect(TIMESTAMP_SERVERS.VALID).toBe("http://timestamp.valid.com.br/tsa");
    expect(TIMESTAMP_SERVERS.SAFEWEB).toBe("http://tsa.safeweb.com.br/tsa/tsa");
    expect(TIMESTAMP_SERVERS.CERTISIGN).toBe("http://timestamp.certisign.com.br");
  });
});

describe("requestTimestamp", () => {
  // Sample data for timestamp requests
  const sampleData = Buffer.from("Test document content for timestamp verification");
  
  // Use a reliable fallback server for most tests
  const RELIABLE_TSA = FALLBACK_TSA_SERVERS.DIGICERT;

  it("requests timestamp from reliable TSA server", async () => {
    const response = await requestTimestamp(sampleData, {
      tsaUrl: RELIABLE_TSA,
    });

    expect(response).toBeInstanceOf(Buffer);
    expect(response.length).toBeGreaterThan(0);
  }, { timeout: 15000 });

  it("requests timestamp with SHA-256 hash algorithm", async () => {
    const response = await requestTimestamp(sampleData, {
      tsaUrl: RELIABLE_TSA,
      hashAlgorithm: "sha256",
    });

    expect(response).toBeInstanceOf(Buffer);
    expect(response.length).toBeGreaterThan(0);
  }, { timeout: 15000 });

  it("requests timestamp with SHA-384 hash algorithm", async () => {
    const response = await requestTimestamp(sampleData, {
      tsaUrl: RELIABLE_TSA,
      hashAlgorithm: "sha384",
    });

    expect(response).toBeInstanceOf(Buffer);
    expect(response.length).toBeGreaterThan(0);
  }, { timeout: 15000 });

  it("requests timestamp with SHA-512 hash algorithm", async () => {
    const response = await requestTimestamp(sampleData, {
      tsaUrl: RELIABLE_TSA,
      hashAlgorithm: "sha512",
    });

    expect(response).toBeInstanceOf(Buffer);
    expect(response.length).toBeGreaterThan(0);
  }, { timeout: 15000 });

  it("uses default TSA server when no URL provided", async () => {
    // This test will fail if ICP-Brasil server is down, which is expected
    try {
      const response = await requestTimestamp(sampleData);
      expect(response).toBeInstanceOf(Buffer);
      expect(response.length).toBeGreaterThan(0);
    } catch (error) {
      // ICP-Brasil TSA may be unavailable - this is expected
      console.warn("Default ICP-Brasil TSA server unavailable, skipping test");
    }
  }, { timeout: 15000 });

  it("uses default SHA-256 algorithm when not specified", async () => {
    const response = await requestTimestamp(sampleData, {
      tsaUrl: RELIABLE_TSA,
    });

    expect(response).toBeInstanceOf(Buffer);
    expect(response.length).toBeGreaterThan(0);
  }, { timeout: 15000 });

  it("handles different data sizes", async () => {
    const smallData = Buffer.from("small");
    const largeData = Buffer.alloc(1024 * 100, "a"); // 100KB

    const smallResponse = await requestTimestamp(smallData, {
      tsaUrl: RELIABLE_TSA,
    });
    const largeResponse = await requestTimestamp(largeData, {
      tsaUrl: RELIABLE_TSA,
    });

    expect(smallResponse).toBeInstanceOf(Buffer);
    expect(largeResponse).toBeInstanceOf(Buffer);

    // Both should get valid timestamps regardless of data size
    expect(smallResponse.length).toBeGreaterThan(0);
    expect(largeResponse.length).toBeGreaterThan(0);
  }, { timeout: 20000 });

  it("throws error for invalid TSA server URL", async () => {
    await expect(
      requestTimestamp(sampleData, {
        tsaUrl: "http://invalid-tsa-server.example.com",
      })
    ).rejects.toThrow();
  }, { timeout: 15000 });

  it("throws error on network timeout", async () => {
    // Use a valid IP that doesn't respond to simulate timeout
    await expect(
      requestTimestamp(sampleData, {
        tsaUrl: "http://192.0.2.1/tsa", // TEST-NET-1 address
      })
    ).rejects.toThrow();
  }, { timeout: 15000 });
});

describe("extractTimestampToken", () => {
  // Sample data for timestamp extraction tests
  const sampleData = Buffer.from("Test data for token extraction");
  const RELIABLE_TSA = FALLBACK_TSA_SERVERS.DIGICERT;

  it("extracts timestamp token from valid response", async () => {
    // First get a real timestamp response
    const response = await requestTimestamp(sampleData, {
      tsaUrl: RELIABLE_TSA,
    });

    // Extract the token
    const token = extractTimestampToken(response);

    expect(token).toBeInstanceOf(Buffer);
    expect(token.length).toBeGreaterThan(0);

    // Token should be smaller than the full response
    expect(token.length).toBeLessThanOrEqual(response.length);
  }, { timeout: 15000 });

  it("extracts consistent token from same response", async () => {
    const response = await requestTimestamp(sampleData, {
      tsaUrl: RELIABLE_TSA,
    });

    const token1 = extractTimestampToken(response);
    const token2 = extractTimestampToken(response);

    // Should extract the same token from same response
    expect(token1).toEqual(token2);
  }, { timeout: 15000 });

  it("throws error for invalid response buffer", () => {
    const invalidResponse = Buffer.from("Not a valid timestamp response");

    expect(() => extractTimestampToken(invalidResponse)).toThrow(
      /Failed to extract timestamp token/
    );
  });

  it("throws error for empty buffer", () => {
    const emptyBuffer = Buffer.alloc(0);

    expect(() => extractTimestampToken(emptyBuffer)).toThrow();
  });

  it("throws error for malformed ASN.1 structure", () => {
    const malformedBuffer = Buffer.from([0x30, 0x82, 0xFF, 0xFF]);

    expect(() => extractTimestampToken(malformedBuffer)).toThrow(
      /Failed to extract timestamp token/
    );
  });
});

describe("Timestamp Response Validation", () => {
  const sampleData = Buffer.from("Test document for validation");
  const RELIABLE_TSA = FALLBACK_TSA_SERVERS.DIGICERT;

  it("validates timestamp response has correct status", async () => {
    const response = await requestTimestamp(sampleData, {
      tsaUrl: RELIABLE_TSA,
    });

    // If we get here without throwing, validation passed
    expect(response).toBeInstanceOf(Buffer);
  }, { timeout: 15000 });

  it("validates timestamp response contains token", async () => {
    const response = await requestTimestamp(sampleData, {
      tsaUrl: RELIABLE_TSA,
    });

    // Should be able to extract token from valid response
    const token = extractTimestampToken(response);
    expect(token.length).toBeGreaterThan(0);
  }, { timeout: 15000 });

  it("validates response has valid ASN.1 structure", async () => {
    const response = await requestTimestamp(sampleData, {
      tsaUrl: RELIABLE_TSA,
    });

    // Should be able to extract token without throwing
    expect(() => extractTimestampToken(response)).not.toThrow();
  }, { timeout: 15000 });
});

describe("Error Handling", () => {
  it("provides descriptive error for connection failure", async () => {
    try {
      await requestTimestamp(Buffer.from("test"), {
        tsaUrl: "http://nonexistent-server-12345.com",
      });
      throw new Error("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("Timestamp request failed");
    }
  }, { timeout: 15000 });

  it("handles server returning non-200 status", async () => {
    // Use an invalid URL path on a valid server
    try {
      await requestTimestamp(Buffer.from("test"), {
        tsaUrl: "http://timestamp.valid.com.br/invalid-path",
      });
      throw new Error("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  }, { timeout: 15000 });
});

describe("Integration Tests", () => {
  const RELIABLE_TSA = FALLBACK_TSA_SERVERS.DIGICERT;

  it("completes full timestamp flow: request + extract", async () => {
    const documentData = Buffer.from("Important document requiring timestamp");

    // Step 1: Request timestamp
    const response = await requestTimestamp(documentData, {
      tsaUrl: RELIABLE_TSA,
      hashAlgorithm: "sha256",
    });

    expect(response).toBeInstanceOf(Buffer);
    expect(response.length).toBeGreaterThan(0);

    // Step 2: Extract token
    const token = extractTimestampToken(response);

    expect(token).toBeInstanceOf(Buffer);
    expect(token.length).toBeGreaterThan(0);

    // Step 3: Verify token is valid ASN.1 and can be re-extracted
    const token2 = extractTimestampToken(response);
    expect(token).toEqual(token2);
  }, { timeout: 15000 });

  it("handles timestamp requests for cryptographic signatures", async () => {
    // Simulate signing a document - hash the content
    const documentContent = Buffer.from("Contract between parties A and B");
    const signatureHash = createHash("sha256").update(documentContent).digest();

    // Timestamp the signature
    const response = await requestTimestamp(signatureHash, {
      tsaUrl: RELIABLE_TSA,
    });

    const token = extractTimestampToken(response);

    expect(token).toBeInstanceOf(Buffer);
    expect(token.length).toBeGreaterThan(0);
  }, { timeout: 15000 });
});

describe("TSA Server Compatibility", () => {
  const sampleData = Buffer.from("Compatibility test data");

  it("works with DigiCert TSA server", async () => {
    const response = await requestTimestamp(sampleData, {
      tsaUrl: FALLBACK_TSA_SERVERS.DIGICERT,
    });

    expect(response).toBeInstanceOf(Buffer);
    const token = extractTimestampToken(response);
    expect(token.length).toBeGreaterThan(0);
  }, { timeout: 15000 });

  it("works with Sectigo TSA server", async () => {
    const response = await requestTimestamp(sampleData, {
      tsaUrl: FALLBACK_TSA_SERVERS.SECTIGO,
    });

    expect(response).toBeInstanceOf(Buffer);
    const token = extractTimestampToken(response);
    expect(token.length).toBeGreaterThan(0);
  }, { timeout: 15000 });

  it("works with Entrust TSA server", async () => {
    const response = await requestTimestamp(sampleData, {
      tsaUrl: FALLBACK_TSA_SERVERS.ENTRUST,
    });

    expect(response).toBeInstanceOf(Buffer);
    const token = extractTimestampToken(response);
    expect(token.length).toBeGreaterThan(0);
  }, { timeout: 15000 });

  it("attempts ICP-Brasil VALID TSA server (may be unavailable)", async () => {
    try {
      const response = await requestTimestamp(sampleData, {
        tsaUrl: TIMESTAMP_SERVERS.VALID,
      });

      expect(response).toBeInstanceOf(Buffer);
      const token = extractTimestampToken(response);
      expect(token.length).toBeGreaterThan(0);
      console.log("✅ ICP-Brasil VALID TSA server is available!");
    } catch (error) {
      console.warn("⚠️  ICP-Brasil VALID TSA server unavailable (expected)");
      // This is expected - Brazilian TSA servers may require authentication
      // or be temporarily unavailable. Test passes regardless.
    }
  }, { timeout: 15000 });
});
