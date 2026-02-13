import { describe, expect, it, beforeAll } from "bun:test";
import { parsePkcs12 } from "../src/pkcs12.ts";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const fixtureDir = join(import.meta.dir, "fixtures");
const p12Path = join(fixtureDir, "test.p12");

beforeAll(() => {
  if (!existsSync(fixtureDir)) {
    mkdirSync(fixtureDir, { recursive: true });
  }
  if (!existsSync(p12Path)) {
    const keyPath = join(fixtureDir, "key.pem");
    const certPath = join(fixtureDir, "cert.pem");

    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=Test/O=FOT"`,
      { stdio: "pipe" },
    );

    // Try with -legacy first (OpenSSL 3.x generates PKCS#12 with legacy algorithms),
    // fall back to default if -legacy is not available
    try {
      execSync(
        `openssl pkcs12 -export -out "${p12Path}" -inkey "${keyPath}" -in "${certPath}" -password pass:test123 -legacy`,
        { stdio: "pipe" },
      );
    } catch {
      execSync(
        `openssl pkcs12 -export -out "${p12Path}" -inkey "${keyPath}" -in "${certPath}" -password pass:test123`,
        { stdio: "pipe" },
      );
    }
  }
});

describe("parsePkcs12", () => {
  it("extracts certificate from P12", async () => {
    const p12Data = new Uint8Array(await Bun.file(p12Path).arrayBuffer());
    const result = parsePkcs12(p12Data, "test123");

    expect(result.certificate).toBeInstanceOf(Uint8Array);
    expect(result.certificate.length).toBeGreaterThan(0);
    // DER-encoded cert starts with SEQUENCE tag
    expect(result.certificate[0]).toBe(0x30);
  });

  it("extracts private key from P12", async () => {
    const p12Data = new Uint8Array(await Bun.file(p12Path).arrayBuffer());
    const result = parsePkcs12(p12Data, "test123");

    expect(result.privateKey).toBeInstanceOf(Uint8Array);
    expect(result.privateKey.length).toBeGreaterThan(0);
    // DER-encoded PKCS#8 key starts with SEQUENCE
    expect(result.privateKey[0]).toBe(0x30);
  });

  it("throws on wrong password", async () => {
    const p12Data = new Uint8Array(await Bun.file(p12Path).arrayBuffer());
    expect(() => parsePkcs12(p12Data, "wrongpassword")).toThrow();
  });

  it("throws on corrupted data", () => {
    expect(() =>
      parsePkcs12(new Uint8Array([0x00, 0x01, 0x02]), "test"),
    ).toThrow();
  });
});
