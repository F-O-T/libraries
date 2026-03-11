import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
   daysUntilExpiry,
   getPemPair,
   isCertificateValid,
   parseCertificate,
} from "../src/certificate.ts";

const fixturesDir = join(import.meta.dir, "fixtures");
const testPfx = readFileSync(join(fixturesDir, "test-certificate.pfx"));
const testPassword = "test1234";

describe("parseCertificate", () => {
   it("parses a valid PFX file", async () => {
      const cert = await parseCertificate(testPfx, testPassword);

      expect(cert).toBeDefined();
      expect(cert.serialNumber).toBeDefined();
      expect(cert.certPem).toContain("-----BEGIN CERTIFICATE-----");
      expect(cert.keyPem).toContain("-----BEGIN PRIVATE KEY-----");
   });

   it("extracts subject fields", async () => {
      const cert = await parseCertificate(testPfx, testPassword);

      expect(cert.subject.commonName).toBe("Test Company LTDA");
      expect(cert.subject.organization).toBe("Test Org");
      expect(cert.subject.country).toBe("BR");
      expect(cert.subject.raw).toBeTruthy();
   });

   it("extracts issuer fields", async () => {
      const cert = await parseCertificate(testPfx, testPassword);

      // Self-signed, so issuer = subject
      expect(cert.issuer.commonName).toBe("Test Company LTDA");
      expect(cert.issuer.organization).toBe("Test Org");
   });

   it("extracts validity dates", async () => {
      const cert = await parseCertificate(testPfx, testPassword);

      expect(cert.validity.notBefore).toBeInstanceOf(Date);
      expect(cert.validity.notAfter).toBeInstanceOf(Date);
      expect(cert.validity.notAfter > cert.validity.notBefore).toBe(true);
   });

   it("computes fingerprint", async () => {
      const cert = await parseCertificate(testPfx, testPassword);

      expect(cert.fingerprint).toBeTruthy();
      // SHA-256 fingerprint is 64 hex chars
      expect(cert.fingerprint).toHaveLength(64);
   });

   it("detects valid certificate", async () => {
      const cert = await parseCertificate(testPfx, testPassword);

      // Test certificate is valid for 10 years
      expect(cert.isValid).toBe(true);
   });

   it("extracts Brazilian CNPJ", async () => {
      const cert = await parseCertificate(testPfx, testPassword);

      expect(cert.brazilian.cnpj).toBe("12345678000190");
   });

   it("stores PFX buffer and password", async () => {
      const cert = await parseCertificate(testPfx, testPassword);

      expect(cert.pfxBuffer).toBeDefined();
      expect(cert.pfxPassword).toBe(testPassword);
   });

   it("throws on wrong password", async () => {
      expect(parseCertificate(testPfx, "wrongpassword")).rejects.toThrow();
   });

   it("throws on invalid PFX data", async () => {
      expect(
         parseCertificate(Buffer.from("not a pfx"), testPassword),
      ).rejects.toThrow();
   });
});

describe("isCertificateValid", () => {
   it("returns true for a valid certificate", async () => {
      const cert = await parseCertificate(testPfx, testPassword);
      expect(isCertificateValid(cert)).toBe(true);
   });
});

describe("daysUntilExpiry", () => {
   it("returns positive days for a valid certificate", async () => {
      const cert = await parseCertificate(testPfx, testPassword);
      const days = daysUntilExpiry(cert);
      expect(days).toBeGreaterThan(0);
   });
});

describe("getPemPair", () => {
   it("returns cert and key PEM strings", async () => {
      const cert = await parseCertificate(testPfx, testPassword);
      const pem = getPemPair(cert);

      expect(pem.cert).toContain("-----BEGIN CERTIFICATE-----");
      expect(pem.key).toContain("-----BEGIN PRIVATE KEY-----");
   });
});
