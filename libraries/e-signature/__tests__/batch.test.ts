import { beforeAll, describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "@f-o-t/pdf/plugins/generation";
import type { BatchSignEvent } from "../src/batch.ts";
import { signPdfBatch, signPdfBatchToArray } from "../src/batch.ts";

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

describe("signPdfBatch", () => {
   it("yields file_start, file_complete, and batch_complete events for a single file", async () => {
      const p12 = await loadP12();
      const pdf = createTestPdf();

      const events: BatchSignEvent[] = [];
      for await (const event of signPdfBatch([{ filename: "doc.pdf", pdf }], {
         certificate: { p12, password: "test123" },
         appearance: false,
      })) {
         events.push(event);
      }

      expect(events).toHaveLength(3);
      expect(events[0]).toEqual({
         type: "file_start",
         fileIndex: 0,
         filename: "doc.pdf",
      });
      expect(events[1]).toMatchObject({
         type: "file_complete",
         fileIndex: 0,
         filename: "doc.pdf",
      });
      expect(
         (events[1] as Extract<BatchSignEvent, { type: "file_complete" }>)
            .signed,
      ).toBeInstanceOf(Uint8Array);
      expect(events[2]).toEqual({
         type: "batch_complete",
         totalFiles: 1,
         errorCount: 0,
      });
   });

   it("yields file_start, file_complete events for multiple files", async () => {
      const p12 = await loadP12();
      const pdf1 = createTestPdf();
      const pdf2 = createTestPdf();

      const events: BatchSignEvent[] = [];
      for await (const event of signPdfBatch(
         [
            { filename: "first.pdf", pdf: pdf1 },
            { filename: "second.pdf", pdf: pdf2 },
         ],
         { certificate: { p12, password: "test123" }, appearance: false },
      )) {
         events.push(event);
      }

      const starts = events.filter((e) => e.type === "file_start");
      const completes = events.filter((e) => e.type === "file_complete");
      const batchComplete = events.find((e) => e.type === "batch_complete");

      expect(starts).toHaveLength(2);
      expect(completes).toHaveLength(2);
      expect(batchComplete).toMatchObject({
         type: "batch_complete",
         totalFiles: 2,
         errorCount: 0,
      });
   });

   it("yields file_error for a failing file and continues processing remaining files", async () => {
      const p12 = await loadP12();
      const goodPdf = createTestPdf();
      const badP12 = new Uint8Array([0x00, 0x01, 0x02]);

      const events: BatchSignEvent[] = [];
      for await (const event of signPdfBatch(
         [
            {
               filename: "bad.pdf",
               pdf: goodPdf,
               options: { certificate: { p12: badP12, password: "wrong" } },
            },
            { filename: "good.pdf", pdf: goodPdf },
         ],
         { certificate: { p12, password: "test123" }, appearance: false },
      )) {
         events.push(event);
      }

      const errorEvent = events.find((e) => e.type === "file_error");
      const completeEvent = events.find(
         (e) =>
            e.type === "file_complete" &&
            (e as Extract<BatchSignEvent, { type: "file_complete" }>)
               .filename === "good.pdf",
      );
      const batchComplete = events.find((e) => e.type === "batch_complete");

      expect(errorEvent).toBeDefined();
      expect(
         (errorEvent as Extract<BatchSignEvent, { type: "file_error" }>)
            .filename,
      ).toBe("bad.pdf");
      expect(completeEvent).toBeDefined();
      expect(batchComplete).toMatchObject({
         type: "batch_complete",
         totalFiles: 2,
         errorCount: 1,
      });
   });

   it("per-file options override base options", async () => {
      const p12 = await loadP12();
      const pdf = createTestPdf();

      const events: BatchSignEvent[] = [];
      for await (const event of signPdfBatch(
         [
            {
               filename: "with-reason.pdf",
               pdf,
               options: {
                  reason: "Per-file reason",
                  location: "Per-file location",
               },
            },
         ],
         {
            certificate: { p12, password: "test123" },
            appearance: false,
            reason: "Base reason",
         },
      )) {
         events.push(event);
      }

      const completeEvent = events.find((e) => e.type === "file_complete") as
         | Extract<BatchSignEvent, { type: "file_complete" }>
         | undefined;

      expect(completeEvent).toBeDefined();
      expect(completeEvent!.signed).toBeInstanceOf(Uint8Array);

      // Verify the signed PDF contains per-file reason, not base reason
      const pdfStr = new TextDecoder("latin1").decode(completeEvent!.signed);
      expect(pdfStr).toContain("Per-file reason");
      expect(pdfStr).not.toContain("Base reason");
   });

   it("yields only batch_complete for an empty batch", async () => {
      const p12 = await loadP12();

      const events: BatchSignEvent[] = [];
      for await (const event of signPdfBatch([], {
         certificate: { p12, password: "test123" },
         appearance: false,
      })) {
         events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
         type: "batch_complete",
         totalFiles: 0,
         errorCount: 0,
      });
   });
});

describe("signPdfBatchToArray", () => {
   it("returns results with signed bytes for each file", async () => {
      const p12 = await loadP12();
      const pdf1 = createTestPdf();
      const pdf2 = createTestPdf();

      const results = await signPdfBatchToArray(
         [
            { filename: "first.pdf", pdf: pdf1 },
            { filename: "second.pdf", pdf: pdf2 },
         ],
         { certificate: { p12, password: "test123" }, appearance: false },
      );

      expect(results).toHaveLength(2);
      expect(results[0]?.filename).toBe("first.pdf");
      expect(results[0]?.signed).toBeInstanceOf(Uint8Array);
      expect(results[0]?.error).toBeUndefined();
      expect(results[1]?.filename).toBe("second.pdf");
      expect(results[1]?.signed).toBeInstanceOf(Uint8Array);
      expect(results[1]?.error).toBeUndefined();
   });

   it("captures error for a failing file without failing the whole batch", async () => {
      const p12 = await loadP12();
      const goodPdf = createTestPdf();
      const badP12 = new Uint8Array([0x00, 0x01, 0x02]);

      const results = await signPdfBatchToArray(
         [
            {
               filename: "bad.pdf",
               pdf: goodPdf,
               options: { certificate: { p12: badP12, password: "wrong" } },
            },
            { filename: "good.pdf", pdf: goodPdf },
         ],
         { certificate: { p12, password: "test123" }, appearance: false },
      );

      expect(results).toHaveLength(2);
      expect(results[0]?.filename).toBe("bad.pdf");
      expect(results[0]?.error).toBeTypeOf("string");
      expect(results[0]?.signed).toBeUndefined();
      expect(results[1]?.filename).toBe("good.pdf");
      expect(results[1]?.signed).toBeInstanceOf(Uint8Array);
      expect(results[1]?.error).toBeUndefined();
   });

   it("returns empty array for empty input", async () => {
      const p12 = await loadP12();

      const results = await signPdfBatchToArray([], {
         certificate: { p12, password: "test123" },
         appearance: false,
      });

      expect(results).toHaveLength(0);
   });
});
