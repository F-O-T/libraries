/**
 * Tests for SubtleCrypto integration paths in pkcs12.ts and cms.ts.
 *
 * Two scenarios are verified:
 *   1. With SubtleCrypto available (default in Bun/Node 18+) — the native path runs.
 *   2. With SubtleCrypto removed — the pure-JS fallback runs and produces the same output.
 *
 * The tests use the same real P12 fixture as pkcs12.test.ts to keep setup minimal.
 */

import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createSignedData } from "../src/cms.ts";
import { parsePkcs12 } from "../src/pkcs12.ts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fixtureDir = join(import.meta.dir, "fixtures");
const p12Path = join(fixtureDir, "test.p12");

let p12Data: Uint8Array;

beforeAll(async () => {
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

   p12Data = new Uint8Array(await Bun.file(p12Path).arrayBuffer());
});

// ---------------------------------------------------------------------------
// Helpers: save / restore globalThis.crypto
// ---------------------------------------------------------------------------

let savedCrypto: typeof globalThis.crypto | undefined;

function removeCrypto(): void {
   savedCrypto = globalThis.crypto;
   // biome-ignore lint/suspicious/noExplicitAny: intentional override for testing
   (globalThis as any).crypto = undefined;
}

function restoreCrypto(): void {
   if (savedCrypto !== undefined) {
      // biome-ignore lint/suspicious/noExplicitAny: intentional override for testing
      (globalThis as any).crypto = savedCrypto;
      savedCrypto = undefined;
   }
}

afterEach(() => {
   // Ensure crypto is always restored even if a test throws
   restoreCrypto();
});

// ---------------------------------------------------------------------------
// parsePkcs12 — SubtleCrypto vs pure-JS PBKDF2
// ---------------------------------------------------------------------------

describe("parsePkcs12 — SubtleCrypto PBKDF2 path", () => {
   it("succeeds when SubtleCrypto is available", async () => {
      // Bun and modern Node expose globalThis.crypto.subtle; this test
      // confirms the native path runs without error.
      expect(globalThis.crypto?.subtle).toBeDefined();

      const result = await parsePkcs12(p12Data, "test123");

      expect(result.certificate).toBeInstanceOf(Uint8Array);
      expect(result.certificate.length).toBeGreaterThan(0);
      expect(result.certificate[0]).toBe(0x30); // DER SEQUENCE
      expect(result.privateKey).toBeInstanceOf(Uint8Array);
      expect(result.privateKey.length).toBeGreaterThan(0);
   });
});

describe("parsePkcs12 — pure-JS PBKDF2 fallback", () => {
   it("succeeds when SubtleCrypto is absent", async () => {
      removeCrypto();

      expect(globalThis.crypto).toBeUndefined();

      const result = await parsePkcs12(p12Data, "test123");

      expect(result.certificate).toBeInstanceOf(Uint8Array);
      expect(result.certificate.length).toBeGreaterThan(0);
      expect(result.certificate[0]).toBe(0x30);
      expect(result.privateKey).toBeInstanceOf(Uint8Array);
      expect(result.privateKey.length).toBeGreaterThan(0);
   });

   it("pure-JS and SubtleCrypto paths produce identical output", async () => {
      // Run with SubtleCrypto
      const withSubtle = await parsePkcs12(p12Data, "test123");

      // Run without SubtleCrypto
      removeCrypto();
      const withoutSubtle = await parsePkcs12(p12Data, "test123");
      restoreCrypto();

      // Certificate and private key bytes must be identical — both paths decrypt
      // the same data; only the PBKDF2 implementation differs.
      expect(withSubtle.certificate).toEqual(withoutSubtle.certificate);
      expect(withSubtle.privateKey).toEqual(withoutSubtle.privateKey);
   });
});

// ---------------------------------------------------------------------------
// createSignedData — SubtleCrypto vs pure-JS signing
// ---------------------------------------------------------------------------

describe("createSignedData — SubtleCrypto signing path", () => {
   it("succeeds when SubtleCrypto is available", async () => {
      expect(globalThis.crypto?.subtle).toBeDefined();

      const { certificate, privateKey, chain } = await parsePkcs12(
         p12Data,
         "test123",
      );
      const content = new TextEncoder().encode("Hello SubtleCrypto");

      const signed = await createSignedData({
         content,
         certificate,
         privateKey,
         chain,
         detached: true,
      });

      expect(signed).toBeInstanceOf(Uint8Array);
      expect(signed[0]).toBe(0x30); // DER SEQUENCE (ContentInfo)
   });
});

describe("createSignedData — pure-JS signing fallback", () => {
   it("succeeds when SubtleCrypto is absent", async () => {
      const { certificate, privateKey, chain } = await parsePkcs12(
         p12Data,
         "test123",
      );
      const content = new TextEncoder().encode("Hello pure-JS fallback");

      removeCrypto();

      const signed = await createSignedData({
         content,
         certificate,
         privateKey,
         chain,
         detached: true,
      });

      expect(signed).toBeInstanceOf(Uint8Array);
      expect(signed[0]).toBe(0x30);
      expect(signed.length).toBeGreaterThan(0);
   });
});
