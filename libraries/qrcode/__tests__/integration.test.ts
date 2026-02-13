import { describe, expect, it } from "bun:test";
import { generateQrCode } from "../src/encoder.ts";

describe("QR code integration", () => {
  it("produces consistent output for same input", () => {
    const result1 = generateQrCode("deterministic");
    const result2 = generateQrCode("deterministic");
    expect(result1).toEqual(result2);
  });

  it("produces different output for different input", () => {
    const result1 = generateQrCode("hello");
    const result2 = generateQrCode("world");
    expect(result1).not.toEqual(result2);
  });

  it("output can be written and read as PNG file", async () => {
    const result = generateQrCode("test file output");
    // Write to temp file and verify it's a valid file
    const tempPath = "/tmp/test-qrcode.png";
    await Bun.write(tempPath, result);
    const readBack = new Uint8Array(await Bun.file(tempPath).arrayBuffer());
    expect(readBack).toEqual(result);
  });
});
