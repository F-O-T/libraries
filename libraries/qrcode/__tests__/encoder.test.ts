import { describe, expect, it } from "bun:test";
import { generateQrCode } from "../src/encoder.ts";

describe("generateQrCode", () => {
  it("generates valid PNG from string", () => {
    const result = generateQrCode("Hello, World!");
    // Check PNG signature
    expect(result[0]).toBe(0x89);
    expect(result[1]).toBe(0x50); // P
    expect(result[2]).toBe(0x4e); // N
    expect(result[3]).toBe(0x47); // G
    expect(result[4]).toBe(0x0d);
    expect(result[5]).toBe(0x0a);
    expect(result[6]).toBe(0x1a);
    expect(result[7]).toBe(0x0a);
  });

  it("generates different outputs for different EC levels", () => {
    const resultL = generateQrCode("test", { errorCorrection: "L" });
    const resultH = generateQrCode("test", { errorCorrection: "H" });
    // Different EC levels should produce different outputs
    expect(resultL).not.toEqual(resultH);
  });

  it("respects size option via IHDR", () => {
    const result = generateQrCode("test", { size: 100 });
    // IHDR is right after PNG signature (8 bytes) + length (4) + "IHDR" (4) = offset 16
    // Width is at offset 16, 4 bytes big-endian
    const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    // Width and height should be equal (square)
    expect(width).toBe(height);
  });

  it("handles URL data", () => {
    const result = generateQrCode("https://example.com/verify?id=12345");
    expect(result[0]).toBe(0x89); // Valid PNG
    expect(result.length).toBeGreaterThan(100); // Non-trivial output
  });

  it("handles long data", () => {
    const longData = "A".repeat(200);
    const result = generateQrCode(longData);
    expect(result[0]).toBe(0x89); // Valid PNG
  });

  it("uses default options", () => {
    const result = generateQrCode("test");
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles margin option", () => {
    const noMargin = generateQrCode("test", { margin: 0, size: 400 });
    const withMargin = generateQrCode("test", { margin: 4, size: 400 });
    // Both produce valid PNGs
    expect(noMargin[0]).toBe(0x89);
    expect(withMargin[0]).toBe(0x89);
    // Different margins produce different output
    expect(noMargin).not.toEqual(withMargin);
    // Read IHDR dimensions to verify margin affects the image
    const noMarginView = new DataView(noMargin.buffer, noMargin.byteOffset, noMargin.byteLength);
    const withMarginView = new DataView(withMargin.buffer, withMargin.byteOffset, withMargin.byteLength);
    const noMarginWidth = noMarginView.getUint32(16);
    const withMarginWidth = withMarginView.getUint32(16);
    // With margin, there are more total modules, so scale changes and dimensions differ
    expect(noMarginWidth).not.toBe(withMarginWidth);
  });
});
