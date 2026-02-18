import { beforeAll, describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "@f-o-t/pdf/plugins/generation";
import { signPdf } from "../src/sign-pdf.ts";

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

function createOnePage(): Uint8Array {
   const doc = new PDFDocument();
   const page = doc.addPage({ size: "Letter" });
   page.drawText("Benchmark test", { x: 50, y: 700, size: 12 });
   return doc.save();
}

function createMultiPage(count: number): Uint8Array {
   const doc = new PDFDocument();
   for (let i = 0; i < count; i++) {
      const page = doc.addPage({ size: "Letter" });
      page.drawText(`Page ${i + 1}`, { x: 50, y: 700, size: 12 });
   }
   return doc.save();
}

interface BenchmarkResult {
   avgMs: number;
   iterations: number;
   maxMs: number;
   minMs: number;
   name: string;
   opsPerSec: number;
   totalMs: number;
}

async function asyncBenchmark(
   name: string,
   fn: () => Promise<void>,
   iterations = 5,
): Promise<BenchmarkResult> {
   const times: number[] = [];
   // warmup
   for (let i = 0; i < 2; i++) {
      await fn();
   }
   for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      times.push(performance.now() - start);
   }
   const totalMs = times.reduce((a, b) => a + b, 0);
   const avgMs = totalMs / iterations;
   return {
      avgMs,
      iterations,
      maxMs: Math.max(...times),
      minMs: Math.min(...times),
      name,
      opsPerSec: 1000 / avgMs,
      totalMs,
   };
}

describe("performance benchmarks", () => {
   it("full sign: single page, no appearance, no timestamp", async () => {
      const p12 = await loadP12();
      const pdf = createOnePage();

      const result = await asyncBenchmark(
         "sign single page, no appearance",
         async () => {
            await signPdf(pdf, {
               certificate: { p12, password: "test123" },
               reason: "Performance test",
               appearance: false,
            });
         },
         5,
      );

      console.log(
         `[${result.name}] avg=${result.avgMs.toFixed(1)}ms min=${result.minMs.toFixed(1)}ms max=${result.maxMs.toFixed(1)}ms ops/s=${result.opsPerSec.toFixed(2)}`,
      );

      expect(result.avgMs).toBeLessThan(2000);
   });

   it("full sign: with QR appearance (single page)", async () => {
      const p12 = await loadP12();
      const pdf = createOnePage();

      const result = await asyncBenchmark(
         "sign single page with appearance",
         async () => {
            await signPdf(pdf, {
               certificate: { p12, password: "test123" },
               reason: "Performance test",
               appearance: {
                  x: 50,
                  y: 50,
                  width: 200,
                  height: 80,
                  page: 0,
                  showCertInfo: true,
               },
            });
         },
         5,
      );

      console.log(
         `[${result.name}] avg=${result.avgMs.toFixed(1)}ms min=${result.minMs.toFixed(1)}ms max=${result.maxMs.toFixed(1)}ms ops/s=${result.opsPerSec.toFixed(2)}`,
      );

      expect(result.avgMs).toBeLessThan(3000);
   });

   it("full sign: with appearances array across 5 pages", async () => {
      const p12 = await loadP12();
      const pdf = createMultiPage(5);

      const result = await asyncBenchmark(
         "sign 5-page doc with appearances array",
         async () => {
            await signPdf(pdf, {
               certificate: { p12, password: "test123" },
               reason: "Performance test",
               appearances: [
                  { x: 50, y: 700, width: 200, height: 80, page: 0 },
                  { x: 50, y: 700, width: 200, height: 80, page: 1 },
                  { x: 50, y: 700, width: 200, height: 80, page: 2 },
                  { x: 50, y: 700, width: 200, height: 80, page: 3 },
                  { x: 50, y: 700, width: 200, height: 80, page: 4 },
               ],
            });
         },
         5,
      );

      console.log(
         `[${result.name}] avg=${result.avgMs.toFixed(1)}ms min=${result.minMs.toFixed(1)}ms max=${result.maxMs.toFixed(1)}ms ops/s=${result.opsPerSec.toFixed(2)}`,
      );

      expect(result.avgMs).toBeLessThan(5000);
   });

   it("sequential signing: 10 PDFs in a loop (total time)", async () => {
      const p12 = await loadP12();
      const pdf = createOnePage();

      const start = performance.now();
      for (let i = 0; i < 10; i++) {
         await signPdf(pdf, {
            certificate: { p12, password: "test123" },
            reason: `Sequential sign ${i + 1}`,
            appearance: false,
         });
      }
      const totalMs = performance.now() - start;

      console.log(
         `[sequential 10 PDFs] total=${totalMs.toFixed(1)}ms avg=${(totalMs / 10).toFixed(1)}ms/doc`,
      );

      expect(totalMs).toBeLessThan(20000);
   });

   it("memory scaling: sign 5 PDFs and measure heap delta", async () => {
      const p12 = await loadP12();
      const pdf = createOnePage();

      // Allow GC to settle before measuring
      await new Promise((resolve) => setTimeout(resolve, 50));

      const startMem = process.memoryUsage().heapUsed;

      for (let i = 0; i < 5; i++) {
         await signPdf(pdf, {
            certificate: { p12, password: "test123" },
            reason: `Memory test ${i + 1}`,
            appearance: false,
         });
      }

      const endMem = process.memoryUsage().heapUsed;
      const deltaMB = (endMem - startMem) / (1024 * 1024);

      console.log(
         `[memory scaling 5 PDFs] heap delta=${deltaMB.toFixed(2)}MB`,
      );

      expect(deltaMB).toBeLessThan(100);
   });

   it("appearances array: QR image XObject is embedded exactly once regardless of appearance count", async () => {
      const p12 = await loadP12();
      const pdf = createMultiPage(5);

      const signed = await signPdf(pdf, {
         certificate: { p12, password: "test123" },
         appearances: [
            { x: 50, y: 50, width: 200, height: 80, page: 0 },
            { x: 50, y: 50, width: 200, height: 80, page: 1 },
            { x: 50, y: 50, width: 200, height: 80, page: 2 },
            { x: 50, y: 50, width: 200, height: 80, page: 3 },
            { x: 50, y: 50, width: 200, height: 80, page: 4 },
         ],
      });

      // Count "/Subtype /Image" entries in the output PDF.
      // Each unique doc.embedPng() call creates one such entry.
      // Before fix: 5 entries (one per appearance). After fix: 1 entry (shared).
      const pdfText = new TextDecoder("latin1").decode(signed);
      const imageXObjectCount = (pdfText.match(/\/Subtype\s*\/Image/g) ?? []).length;

      expect(imageXObjectCount).toBe(1);
   });

   it("appearances array: signing time does not scale linearly with appearance count", async () => {
      const p12 = await loadP12();
      const pdf1 = createMultiPage(1);
      const pdf10 = createMultiPage(10);

      const t1Start = performance.now();
      await signPdf(pdf1, {
         certificate: { p12, password: "test123" },
         appearances: [{ x: 50, y: 50, width: 200, height: 80, page: 0 }],
      });
      const t1 = performance.now() - t1Start;

      const t10Start = performance.now();
      await signPdf(pdf10, {
         certificate: { p12, password: "test123" },
         appearances: Array.from({ length: 10 }, (_, i) => ({
            x: 50, y: 50, width: 200, height: 80, page: i,
         })),
      });
      const t10 = performance.now() - t10Start;

      console.log(`[appearances scaling] 1 appearance: ${t1.toFixed(0)}ms, 10 appearances: ${t10.toFixed(0)}ms, ratio: ${(t10 / t1).toFixed(1)}x`);

      // After fix: 10 appearances should take < 6x as long as 1.
      expect(t10).toBeLessThan(t1 * 6);
   });
});
