import { expect, setDefaultTimeout, test } from "bun:test";
import { generateQrCode } from "../src/encoder.ts";

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

test("performance: generate QR for short string (~30 chars)", () => {
  const data = "https://validar.iti.gov.br/";

  const result = benchmark(
    "qrcode-short",
    () => {
      generateQrCode(data);
    },
    100,
  );

  console.log(formatResult(result));

  const output = generateQrCode(data);
  expect(output).toBeInstanceOf(Uint8Array);
  // PNG magic bytes: 0x89 0x50 0x4E 0x47
  expect(output[0]).toBe(0x89);
  expect(output[1]).toBe(0x50);
  expect(output[2]).toBe(0x4e);
  expect(output[3]).toBe(0x47);

  expect(result.avgMs).toBeLessThan(50);
});

test("performance: generate QR for medium string (~100 chars)", () => {
  const data =
    "https://validar.iti.gov.br/validar?token=abc123&documento=12345678901&hash=a1b2c3d4e5f6789012345";

  const result = benchmark(
    "qrcode-medium",
    () => {
      generateQrCode(data);
    },
    50,
  );

  console.log(formatResult(result));
  expect(result.avgMs).toBeLessThan(100);
});

test("performance: generate QR for long string (~500 chars)", () => {
  const base =
    "https://validar.iti.gov.br/validar?token=abc123&documento=12345678901&hash=a1b2c3d4e5f6789012345&extra=";
  const data = (base + "X".repeat(500 - base.length)).slice(0, 500);

  const result = benchmark(
    "qrcode-long",
    () => {
      generateQrCode(data);
    },
    20,
  );

  console.log(formatResult(result));
  expect(result.avgMs).toBeLessThan(200);
});
