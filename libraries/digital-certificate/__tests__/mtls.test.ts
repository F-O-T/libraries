import { describe, expect, it } from "bun:test";
import https from "node:https";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCertificate } from "../src/certificate.ts";
import {
   createHttpsAgent,
   createTlsContext,
   getMtlsPemPair,
} from "../src/mtls.ts";

const fixturesDir = join(import.meta.dir, "fixtures");
const testPfx = readFileSync(join(fixturesDir, "test-certificate.pfx"));
const testPassword = "test1234";

describe("mTLS utilities", () => {
   const cert = parseCertificate(testPfx, testPassword);

   describe("createTlsContext", () => {
      it("creates a TLS secure context", () => {
         const ctx = createTlsContext(cert);
         expect(ctx).toBeDefined();
         // SecureContext is an opaque object, just verify it was created
         expect(typeof ctx).toBe("object");
      });

      it("accepts additional CA certs", () => {
         const ctx = createTlsContext(cert, {
            caCerts: [cert.certPem],
         });
         expect(ctx).toBeDefined();
      });
   });

   describe("createHttpsAgent", () => {
      it("creates an HTTPS agent", () => {
         const agent = createHttpsAgent(cert);
         expect(agent).toBeInstanceOf(https.Agent);
      });

      it("creates agent with rejectUnauthorized false", () => {
         const agent = createHttpsAgent(cert, {
            rejectUnauthorized: false,
         });
         expect(agent).toBeInstanceOf(https.Agent);
      });
   });

   describe("getMtlsPemPair", () => {
      it("returns cert and key PEM strings", () => {
         const pem = getMtlsPemPair(cert);

         expect(pem.cert).toContain("-----BEGIN CERTIFICATE-----");
         expect(pem.key).toContain("-----BEGIN PRIVATE KEY-----");
         expect(pem.cert).toContain("-----END CERTIFICATE-----");
         expect(pem.key).toContain("-----END PRIVATE KEY-----");
      });
   });
});
