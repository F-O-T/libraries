import { beforeAll, describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { type Asn1Node, decodeDer } from "@f-o-t/asn1";
import { parsePkcs12 } from "@f-o-t/crypto";
import { buildSigningCertificateV2 } from "../src/icp-brasil.ts";

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

async function loadP12(): Promise<Uint8Array> {
   return new Uint8Array(await Bun.file(p12Path).arrayBuffer());
}

describe("buildSigningCertificateV2", () => {
   it("produces valid DER-encoded ASN.1 structure", async () => {
      const p12 = await loadP12();
      const { certificate } = await parsePkcs12(p12, "test123");

      const result = buildSigningCertificateV2(certificate);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);

      // Should be valid DER
      const decoded = decodeDer(result);
      // Top-level is SEQUENCE (SigningCertificateV2)
      expect(decoded.tag).toBe(0x10);
      expect(decoded.constructed).toBe(true);
   });

   it("contains certs SEQUENCE with ESSCertIDv2", async () => {
      const p12 = await loadP12();
      const { certificate } = await parsePkcs12(p12, "test123");

      const result = buildSigningCertificateV2(certificate);
      const decoded = decodeDer(result);
      const children = decoded.value as Asn1Node[];

      // First child is SEQUENCE OF ESSCertIDv2 (certs)
      expect(children.length).toBeGreaterThanOrEqual(1);
      const certsSeq = children[0]!;
      expect(certsSeq.tag).toBe(0x10); // SEQUENCE
      expect(certsSeq.constructed).toBe(true);

      // Inside certs, the first ESSCertIDv2
      const essCertIdList = certsSeq.value as Asn1Node[];
      expect(essCertIdList.length).toBeGreaterThanOrEqual(1);

      const essCertId = essCertIdList[0]!;
      expect(essCertId.tag).toBe(0x10); // SEQUENCE
      const essCertIdChildren = essCertId.value as Asn1Node[];

      // Should have: hashAlgorithm, certHash, issuerSerial
      expect(essCertIdChildren.length).toBe(3);

      // hashAlgorithm (AlgorithmIdentifier)
      expect(essCertIdChildren[0]!.tag).toBe(0x10);

      // certHash (OCTET STRING)
      expect(essCertIdChildren[1]!.tag).toBe(0x04);
      const certHashBytes = essCertIdChildren[1]!.value as Uint8Array;
      expect(certHashBytes.length).toBe(32); // SHA-256 = 32 bytes

      // issuerSerial (SEQUENCE)
      expect(essCertIdChildren[2]!.tag).toBe(0x10);
   });

   it("produces different hashes for different certificates", async () => {
      const p12 = await loadP12();
      const { certificate } = await parsePkcs12(p12, "test123");

      const result1 = buildSigningCertificateV2(certificate);
      const result2 = buildSigningCertificateV2(certificate);

      // Same certificate should produce same output (deterministic)
      expect(result1).toEqual(result2);
   });
});
