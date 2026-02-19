import { expect, setDefaultTimeout, test } from "bun:test";
import { join } from "node:path";
import { createSignedData } from "../src/cms.ts";
import { hash } from "../src/hash.ts";
import { parsePkcs12 } from "../src/pkcs12.ts";

setDefaultTimeout(120000);

interface BenchmarkResult {
   name: string;
   iterations: number;
   totalMs: number;
   avgMs: number;
   minMs: number;
   maxMs: number;
   opsPerSec: number;
}

function benchmark(
   name: string,
   fn: () => void,
   iterations = 100,
): BenchmarkResult {
   const times: number[] = [];

   // Warmup
   for (let i = 0; i < 5; i++) {
      fn();
   }

   for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      fn();
      const end = performance.now();
      times.push(end - start);
   }

   const totalMs = times.reduce((a, b) => a + b, 0);
   const avgMs = totalMs / iterations;
   const minMs = Math.min(...times);
   const maxMs = Math.max(...times);
   const opsPerSec = 1000 / avgMs;

   return { avgMs, iterations, maxMs, minMs, name, opsPerSec, totalMs };
}

function formatResult(result: BenchmarkResult): string {
   return `${result.name}: avg=${result.avgMs.toFixed(3)}ms, min=${result.minMs.toFixed(3)}ms, max=${result.maxMs.toFixed(3)}ms, ops/s=${result.opsPerSec.toFixed(2)}`;
}

const fixtureDir = join(import.meta.dir, "fixtures");
const p12Path = join(fixtureDir, "test.p12");

test("performance: PKCS#12 parse", async () => {
   const p12Data = await Bun.file(p12Path).bytes();

   const result = benchmark(
      "pkcs12-parse",
      () => {
         parsePkcs12(p12Data, "test123");
      },
      20,
   );

   console.log(formatResult(result));
   // Pure-TS implementation: threshold relaxed from 50ms (native) to 500ms.
   // TODO: optimize if performance becomes a bottleneck.
   expect(result.avgMs).toBeLessThan(500);
});

test("performance: SHA-256 hash of 1 MB payload", () => {
   const payload = new Uint8Array(1024 * 1024).fill(0xab);

   const result = benchmark(
      "sha256-1mb",
      () => {
         hash("sha256", payload);
      },
      100,
   );

   console.log(formatResult(result));
   // Pure-TS implementation: threshold relaxed from 20ms (native) to 500ms.
   // TODO: optimize pure-TS SHA-256 or add WebCrypto fallback for perf-sensitive paths.
   expect(result.avgMs).toBeLessThan(500);
});

test("performance: SHA-512 hash of 1 MB payload", () => {
   const payload = new Uint8Array(1024 * 1024).fill(0xab);

   const result = benchmark(
      "sha512-1mb",
      () => {
         hash("sha512", payload);
      },
      100,
   );

   console.log(formatResult(result));
   // Pure-TS implementation: threshold relaxed from 20ms (native) to 2000ms.
   // SHA-512 is significantly slower in pure-TS (64-bit arithmetic emulated with BigInt).
   // TODO: optimize pure-TS SHA-512 or add WebCrypto fallback.
   expect(result.avgMs).toBeLessThan(2000);
});

test("performance: RSA-PKCS1v15 sign (digest)", async () => {
   const p12Data = await Bun.file(p12Path).bytes();
   const { certificate, privateKey, chain } = parsePkcs12(p12Data, "test123");

   const digest = new Uint8Array(32).fill(0xcd);

   const result = benchmark(
      "rsa-sign-digest",
      () => {
         createSignedData({
            content: digest,
            certificate,
            privateKey,
            chain,
            hashAlgorithm: "sha256",
            detached: true,
         });
      },
      10,
   );

   console.log(formatResult(result));
   expect(result.avgMs).toBeLessThan(200);
});
