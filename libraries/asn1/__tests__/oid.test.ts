import { describe, expect, it } from "bun:test";
import { bytesToOid, oidToBytes } from "../src/oid.ts";

describe("oidToBytes", () => {
   it("encodes 1.2.840.113549.1.1.11 (sha256WithRSAEncryption)", () => {
      const bytes = oidToBytes("1.2.840.113549.1.1.11");
      // Known encoding: 2a 86 48 86 f7 0d 01 01 0b
      expect(bytes).toEqual(
         new Uint8Array([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b]),
      );
   });

   it("encodes 2.5.4.3 (CN)", () => {
      const bytes = oidToBytes("2.5.4.3");
      expect(bytes).toEqual(new Uint8Array([0x55, 0x04, 0x03]));
   });

   it("encodes 1.2.840.113549.1.7.2 (signedData)", () => {
      const bytes = oidToBytes("1.2.840.113549.1.7.2");
      expect(bytes).toEqual(
         new Uint8Array([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02]),
      );
   });
});

describe("bytesToOid", () => {
   it("decodes sha256WithRSAEncryption", () => {
      const oid = bytesToOid(
         new Uint8Array([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b]),
      );
      expect(oid).toBe("1.2.840.113549.1.1.11");
   });

   it("decodes CN", () => {
      const oid = bytesToOid(new Uint8Array([0x55, 0x04, 0x03]));
      expect(oid).toBe("2.5.4.3");
   });
});

describe("round-trip", () => {
   const oids = [
      "1.2.840.113549.1.1.11",
      "2.5.4.3",
      "1.2.840.113549.1.7.2",
      "1.2.840.113549.1.9.3",
      "1.2.840.113549.1.9.4",
      "2.16.76.1.7.1.11.1.1",
      "1.2.840.113549.1.9.16.2.47",
   ];

   for (const oidStr of oids) {
      it(`round-trips ${oidStr}`, () => {
         const bytes = oidToBytes(oidStr);
         const decoded = bytesToOid(bytes);
         expect(decoded).toBe(oidStr);
      });
   }
});
