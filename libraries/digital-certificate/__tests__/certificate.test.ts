import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
   daysUntilExpiry,
   getPemPair,
   isCertificateValid,
   parseCertificate,
} from "../src/certificate.ts";
import { CertificateParseError } from "../src/errors.ts";

const fixturesDir = join(import.meta.dir, "fixtures");
const testPfx = readFileSync(join(fixturesDir, "test-certificate.pfx"));
const testPassword = "test1234";
const lacunaPassword = "1234";

async function parseOk(pfx: Uint8Array, password: string) {
   const result = await parseCertificate(pfx, password);
   if (result.isErr()) throw result.error;
   return result.value;
}

describe("parseCertificate", () => {
   it("parses a valid PFX file", async () => {
      const cert = await parseOk(testPfx, testPassword);

      expect(cert).toBeDefined();
      expect(cert.serialNumber).toBeDefined();
      expect(cert.certPem).toContain("-----BEGIN CERTIFICATE-----");
      expect(cert.keyPem).toContain("-----BEGIN PRIVATE KEY-----");
   });

   it("extracts subject fields", async () => {
      const cert = await parseOk(testPfx, testPassword);

      expect(cert.subject.commonName).toBe("Test Company LTDA");
      expect(cert.subject.organization).toBe("Test Org");
      expect(cert.subject.country).toBe("BR");
      expect(cert.subject.raw).toBeTruthy();
   });

   it("extracts issuer fields", async () => {
      const cert = await parseOk(testPfx, testPassword);

      // Self-signed, so issuer = subject
      expect(cert.issuer.commonName).toBe("Test Company LTDA");
      expect(cert.issuer.organization).toBe("Test Org");
   });

   it("extracts validity dates", async () => {
      const cert = await parseOk(testPfx, testPassword);

      expect(cert.validity.notBefore).toBeInstanceOf(Date);
      expect(cert.validity.notAfter).toBeInstanceOf(Date);
      expect(cert.validity.notAfter > cert.validity.notBefore).toBe(true);
   });

   it("computes fingerprint", async () => {
      const cert = await parseOk(testPfx, testPassword);

      expect(cert.fingerprint).toBeTruthy();
      // SHA-256 fingerprint is 64 hex chars
      expect(cert.fingerprint).toHaveLength(64);
   });

   it("detects valid certificate", async () => {
      const cert = await parseOk(testPfx, testPassword);

      // Test certificate is valid for 10 years
      expect(cert.isValid).toBe(true);
   });

   it("extracts Brazilian CNPJ", async () => {
      const cert = await parseOk(testPfx, testPassword);

      expect(cert.brazilian.cnpj).toBe("12345678000190");
   });

   it("extracts CPF from ICP-Brasil subjectAltName otherName", async () => {
      const lacunaTuringPfx = readFileSync(join(fixturesDir, "lacuna-turing.pfx"));
      const cert = await parseOk(lacunaTuringPfx, lacunaPassword);

      expect(cert.brazilian.cpf).toBe("56072386105");
      expect(cert.subjectAltName).toContain("CPF=56072386105");
   });

   it("extracts CNPJ from ICP-Brasil subjectAltName otherName", async () => {
      const lacunaWaynePfx = readFileSync(join(fixturesDir, "lacuna-wayne.pfx"));
      const cert = await parseOk(lacunaWaynePfx, lacunaPassword);

      expect(cert.brazilian.cnpj).toBe("34785515000166");
      expect(cert.subjectAltName).toContain("CNPJ=34785515000166");
   });

   it("stores PFX buffer and password", async () => {
      const cert = await parseOk(testPfx, testPassword);

      expect(cert.pfxBuffer).toBeDefined();
      expect(cert.pfxPassword).toBe(testPassword);
   });

   it("returns WRONG_PASSWORD on wrong password", async () => {
      const result = await parseCertificate(testPfx, "wrongpassword");

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(CertificateParseError);
      expect(result._unsafeUnwrapErr().code).toBe("WRONG_PASSWORD");
   });

   it("returns INVALID_FORMAT on non-PFX data", async () => {
      const result = await parseCertificate(Buffer.from("not a pfx"), testPassword);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(CertificateParseError);
      expect(result._unsafeUnwrapErr().code).toBe("INVALID_FORMAT");
   });

   it("returns EMPTY_FILE on empty buffer", async () => {
      const result = await parseCertificate(new Uint8Array(0), testPassword);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(CertificateParseError);
      expect(result._unsafeUnwrapErr().code).toBe("EMPTY_FILE");
   });

   it("returns INVALID_FORMAT with detected type for PDF file", async () => {
      // PDF magic bytes: %PDF
      const fakePdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]);
      const result = await parseCertificate(fakePdf, testPassword);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(CertificateParseError);
      expect(result._unsafeUnwrapErr().code).toBe("INVALID_FORMAT");
      expect(result._unsafeUnwrapErr().message).toContain("PDF");
   });

   it("returns INVALID_FORMAT with detected type for PNG image", async () => {
      const fakePng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
      const result = await parseCertificate(fakePng, testPassword);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(CertificateParseError);
      expect(result._unsafeUnwrapErr().code).toBe("INVALID_FORMAT");
      expect(result._unsafeUnwrapErr().message).toContain("PNG");
   });

   it("preserves original error as cause", async () => {
      const result = await parseCertificate(testPfx, "wrongpassword");

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(CertificateParseError);
      expect(result._unsafeUnwrapErr().cause).toBeDefined();
   });
});

describe("isCertificateValid", () => {
   it("returns true for a valid certificate", async () => {
      const cert = await parseOk(testPfx, testPassword);
      expect(isCertificateValid(cert)).toBe(true);
   });
});

describe("daysUntilExpiry", () => {
   it("returns positive days for a valid certificate", async () => {
      const cert = await parseOk(testPfx, testPassword);
      const days = daysUntilExpiry(cert);
      expect(days).toBeGreaterThan(0);
   });
});

describe("getPemPair", () => {
   it("returns cert and key PEM strings", async () => {
      const cert = await parseOk(testPfx, testPassword);
      const pem = getPemPair(cert);

      expect(pem.cert).toContain("-----BEGIN CERTIFICATE-----");
      expect(pem.key).toContain("-----BEGIN PRIVATE KEY-----");
   });
});
