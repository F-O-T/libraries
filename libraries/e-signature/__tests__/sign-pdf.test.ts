import { beforeAll, describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "@f-o-t/pdf/plugins/generation";
import { PdfSignError, signPdf } from "../src/sign-pdf.ts";

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

function createTestPdf(): Uint8Array {
   const doc = new PDFDocument();
   doc.addPage({ width: 612, height: 792 });
   return doc.save();
}

async function loadP12(): Promise<Uint8Array> {
   return new Uint8Array(await Bun.file(p12Path).arrayBuffer());
}

describe("signPdf", () => {
   it("embeds RFC 3161 timestamp token as unauthenticated attribute in CMS when timestamp:true", async () => {
      // Minimal valid TimeStampResp DER:
      // SEQUENCE {
      //   SEQUENCE { INTEGER 0 }  <- PKIStatusInfo (status=granted)
      //   SEQUENCE {}              <- TimeStampToken (empty for test)
      // }
      const fakeTsaResponse = new Uint8Array([
         0x30, 0x07, // SEQUENCE (7 bytes)
         0x30, 0x03, //   SEQUENCE (PKIStatusInfo, 3 bytes)
         0x02, 0x01, 0x00, //     INTEGER 0 (status=granted)
         0x30, 0x00, //   SEQUENCE {} (TimeStampToken)
      ]);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
         new Response(fakeTsaResponse, {
            headers: { "Content-Type": "application/timestamp-reply" },
         });

      try {
         const pdf = createTestPdf();
         const p12 = await loadP12();

         const result = await signPdf(pdf, {
            certificate: { p12, password: "test123" },
            appearance: false,
            timestamp: true,
            tsaUrl: "http://mock.tsa/",
         });

         // The PDF embeds the CMS signature as lowercase hex in /Contents <...>
         // OID 1.2.840.113549.1.9.16.2.14 (id-smime-aa-timeStampToken) in DER:
         //   06 0b 2a 86 48 86 f7 0d 01 09 10 02 0e
         const pdfStr = new TextDecoder("latin1").decode(result);
         const contentsMatch = pdfStr.match(/\/Contents\s*<([0-9a-fA-F]+)/);
         expect(contentsMatch).not.toBeNull();
         const hexStr = contentsMatch![1]!;
         expect(hexStr).toContain("060b2a864886f70d010910020e");
      } finally {
         globalThis.fetch = originalFetch;
      }
   });


   it("signs a PDF without appearance", async () => {
      const pdf = createTestPdf();
      const p12 = await loadP12();

      const result = await signPdf(pdf, {
         certificate: { p12, password: "test123" },
         appearance: false,
      });

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(pdf.length);
   });

   it("includes PKCS#7 signature markers in output", async () => {
      const pdf = createTestPdf();
      const p12 = await loadP12();

      const result = await signPdf(pdf, {
         certificate: { p12, password: "test123" },
         appearance: false,
      });

      const pdfStr = new TextDecoder("latin1").decode(result);
      expect(pdfStr).toContain("/SubFilter /adbe.pkcs7.detached");
      expect(pdfStr).toContain("/ByteRange");
   });

   it("signs a PDF with visual appearance and cert info", async () => {
      const pdf = createTestPdf();
      const p12 = await loadP12();

      const result = await signPdf(pdf, {
         certificate: { p12, password: "test123" },
         reason: "Test signing",
         location: "Test Location",
         appearance: {
            x: 50,
            y: 50,
            width: 300,
            height: 100,
            page: 0,
            showCertInfo: true,
         },
      });

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(pdf.length);
   });

   it("includes reason and location in signature dictionary", async () => {
      const pdf = createTestPdf();
      const p12 = await loadP12();

      const result = await signPdf(pdf, {
         certificate: { p12, password: "test123" },
         reason: "Approval",
         location: "Office",
         contactInfo: "test@example.com",
         appearance: false,
      });

      const pdfStr = new TextDecoder("latin1").decode(result);
      expect(pdfStr).toContain("Approval");
      expect(pdfStr).toContain("Office");
      expect(pdfStr).toContain("test@example.com");
   });

   it("rejects invalid certificate data", async () => {
      const pdf = createTestPdf();
      const badP12 = new Uint8Array([0x00, 0x01, 0x02]);

      await expect(
         signPdf(pdf, {
            certificate: { p12: badP12, password: "wrong" },
            appearance: false,
         }),
      ).rejects.toThrow();
   });

   it("rejects empty P12 data", async () => {
      const pdf = createTestPdf();

      await expect(
         signPdf(pdf, {
            certificate: { p12: new Uint8Array(0), password: "" },
            appearance: false,
         }),
      ).rejects.toThrow();
   });

   it("signs a PDF with appearances array (multi-page stamps)", async () => {
      const multiDoc = new PDFDocument();
      multiDoc.addPage({ width: 612, height: 792 });
      multiDoc.addPage({ width: 612, height: 792 });
      multiDoc.addPage({ width: 612, height: 792 });
      const pdf = multiDoc.save();
      const p12 = await loadP12();

      const result = await signPdf(pdf, {
         certificate: { p12, password: "test123" },
         appearances: [
            { x: 50, y: 730, width: 200, height: 80, page: 0 },
            { x: 50, y: 730, width: 200, height: 80, page: 1 },
            { x: 50, y: 730, width: 200, height: 80, page: 2 },
         ],
      });

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(pdf.length);
   });

   it("treats empty appearances array as no-op", async () => {
      const pdf = createTestPdf();
      const p12 = await loadP12();

      const result = await signPdf(pdf, {
         certificate: { p12, password: "test123" },
         appearances: [],
      });

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(pdf.length);
   });

   it("throws PdfSignError when appearances entry has out-of-range page index", async () => {
      const pdf = createTestPdf(); // single-page PDF
      const p12 = await loadP12();

      await expect(
         signPdf(pdf, {
            certificate: { p12, password: "test123" },
            appearances: [
               { x: 50, y: 730, width: 200, height: 80, page: 0 },
               { x: 50, y: 730, width: 200, height: 80, page: 5 },
            ],
         }),
      ).rejects.toThrow(PdfSignError);
   });

   it("applies both appearance and appearances when both are given", async () => {
      const multiDoc = new PDFDocument();
      multiDoc.addPage({ width: 612, height: 792 });
      multiDoc.addPage({ width: 612, height: 792 });
      const pdf = multiDoc.save();
      const p12 = await loadP12();

      const result = await signPdf(pdf, {
         certificate: { p12, password: "test123" },
         appearance: { x: 10, y: 10, width: 100, height: 50, page: 0 },
         appearances: [{ x: 50, y: 730, width: 200, height: 80, page: 1 }],
      });

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(pdf.length);
   });
});
