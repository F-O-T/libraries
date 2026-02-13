import { describe, expect, it } from "bun:test";
import { pemToDer, derToPem } from "../src/pem.ts";

describe("PEM utilities", () => {
  const sampleDer = new Uint8Array([0x30, 0x03, 0x02, 0x01, 0x01]); // SEQUENCE { INTEGER 1 }

  it("round-trips DER through PEM", () => {
    const pem = derToPem(sampleDer, "TEST");
    expect(pem).toContain("-----BEGIN TEST-----");
    expect(pem).toContain("-----END TEST-----");
    const decoded = pemToDer(pem);
    expect(decoded).toEqual(sampleDer);
  });

  it("handles multi-line base64", () => {
    const largeDer = new Uint8Array(1000);
    const pem = derToPem(largeDer, "CERTIFICATE");
    const lines = pem.split("\n");
    // Check each content line is at most 64 chars
    for (const line of lines.slice(1, -1)) {
      expect(line.length).toBeLessThanOrEqual(64);
    }
    const decoded = pemToDer(pem);
    expect(decoded).toEqual(largeDer);
  });

  it("handles Windows line endings", () => {
    const pem = derToPem(sampleDer, "TEST").replace(/\n/g, "\r\n");
    const decoded = pemToDer(pem);
    expect(decoded).toEqual(sampleDer);
  });
});
