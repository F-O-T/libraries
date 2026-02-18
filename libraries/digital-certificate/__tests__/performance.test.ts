import { expect, setDefaultTimeout, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

setDefaultTimeout(120000);

import {
   daysUntilExpiry,
   getPemPair,
   isCertificateValid,
   parseCertificate,
} from "../src/certificate.ts";

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

const fixturesDir = join(import.meta.dir, "fixtures");
const testPassword = "test1234";

test("performance: parseCertificate (P12 → CertificateInfo)", () => {
   const testPfx = readFileSync(join(fixturesDir, "test-certificate.pfx"));

   const result = benchmark(
      "parse-certificate",
      () => {
         parseCertificate(testPfx, testPassword);
      },
      20,
   );

   console.log(formatResult(result));
   expect(result.avgMs).toBeLessThan(100);

   // Also assert that cert.subject.commonName is defined
   const cert = parseCertificate(testPfx, testPassword);
   expect(cert.subject.commonName).toBeDefined();
});

test("performance: getPemPair from P12", () => {
   const testPfx = readFileSync(join(fixturesDir, "test-certificate.pfx"));
   const cert = parseCertificate(testPfx, testPassword);

   const result = benchmark(
      "get-pem-pair",
      () => {
         getPemPair(cert);
      },
      20,
   );

   console.log(formatResult(result));
   expect(result.avgMs).toBeLessThan(100);
});

test("performance: isCertificateValid (pure computation)", () => {
   const testPfx = readFileSync(join(fixturesDir, "test-certificate.pfx"));
   const cert = parseCertificate(testPfx, testPassword);

   const result = benchmark(
      "is-certificate-valid",
      () => {
         isCertificateValid(cert);
      },
      1000,
   );

   console.log(formatResult(result));
   expect(result.avgMs).toBeLessThan(1);
});

test("performance: daysUntilExpiry calculation", () => {
   const testPfx = readFileSync(join(fixturesDir, "test-certificate.pfx"));
   const cert = parseCertificate(testPfx, testPassword);

   const result = benchmark(
      "days-until-expiry",
      () => {
         daysUntilExpiry(cert);
      },
      1000,
   );

   console.log(formatResult(result));
   expect(result.avgMs).toBeLessThan(1);
});
