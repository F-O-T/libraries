import { beforeAll, describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { type Asn1Node, bytesToOid, decodeDer } from "@f-o-t/asn1";
import { createSignedData } from "../src/cms.ts";
import { parsePkcs12 } from "../src/pkcs12.ts";

const fixtureDir = join(import.meta.dir, "fixtures");
const p12Path = join(fixtureDir, "test.p12");

let certificate: Uint8Array;
let privateKey: Uint8Array;
let chain: Uint8Array[];

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

   const p12Data = new Uint8Array(await Bun.file(p12Path).arrayBuffer());
   const result = await parsePkcs12(p12Data, "test123");
   certificate = result.certificate;
   privateKey = result.privateKey;
   chain = result.chain;
});

describe("createSignedData", () => {
   it("creates valid CMS ContentInfo", async () => {
      const content = new TextEncoder().encode("Hello, World!");
      const result = await createSignedData({
         content,
         certificate,
         privateKey,
         chain,
         detached: true,
      });

      expect(result).toBeInstanceOf(Uint8Array);
      // Should start with SEQUENCE
      expect(result[0]).toBe(0x30);

      // Decode and verify OID
      const contentInfo = decodeDer(result);
      const children = contentInfo.value as Asn1Node[];
      // First child should be OID for signedData
      expect(children[0]!.tag).toBe(6); // OID
      const oidStr = bytesToOid(children[0]!.value as Uint8Array);
      expect(oidStr).toBe("1.2.840.113549.1.7.2");
   });

   it("includes custom authenticated attributes", async () => {
      const content = new TextEncoder().encode("test");
      const customAttrValue = new Uint8Array([0x04, 0x03, 0x01, 0x02, 0x03]); // OCTET STRING

      const result = await createSignedData({
         content,
         certificate,
         privateKey,
         authenticatedAttributes: [
            {
               oid: "1.2.3.4.5",
               values: [customAttrValue],
            },
         ],
         detached: true,
      });

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
   });

   it("supports unauthenticated attributes", async () => {
      const content = new TextEncoder().encode("test");
      const result = await createSignedData({
         content,
         certificate,
         privateKey,
         unauthenticatedAttributes: [
            {
               oid: "1.2.840.113549.1.9.16.2.14",
               values: [new Uint8Array([0x30, 0x00])],
            },
         ],
         detached: true,
      });

      expect(result).toBeInstanceOf(Uint8Array);
   });

   it("supports non-detached mode", async () => {
      const content = new TextEncoder().encode("test content");
      const result = await createSignedData({
         content,
         certificate,
         privateKey,
         detached: false,
      });

      expect(result).toBeInstanceOf(Uint8Array);

      // Decode and verify the encapsulated content is present
      const contentInfo = decodeDer(result);
      const children = contentInfo.value as Asn1Node[];
      // [0] EXPLICIT contains SignedData
      const signedDataWrapper = children[1]!;
      const signedData = (signedDataWrapper.value as Asn1Node[])[0]!;
      const sdChildren = signedData.value as Asn1Node[];
      // encapContentInfo is the 3rd child (index 2)
      const encapContentInfo = sdChildren[2]!;
      const eciChildren = encapContentInfo.value as Asn1Node[];
      // Should have 2 children: OID + [0] EXPLICIT content
      expect(eciChildren.length).toBe(2);
   });

   it("supports SHA-384", async () => {
      const content = new TextEncoder().encode("test");
      const result = await createSignedData({
         content,
         certificate,
         privateKey,
         hashAlgorithm: "sha384",
         detached: true,
      });

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result[0]).toBe(0x30);
   });

   it("supports SHA-512", async () => {
      const content = new TextEncoder().encode("test");
      const result = await createSignedData({
         content,
         certificate,
         privateKey,
         hashAlgorithm: "sha512",
         detached: true,
      });

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result[0]).toBe(0x30);
   });
});
