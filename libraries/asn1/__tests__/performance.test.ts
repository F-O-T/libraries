import { expect, setDefaultTimeout, test } from "bun:test";

setDefaultTimeout(120000);

import {
   bitString,
   contextTag,
   decodeDer,
   encodeDer,
   integer,
   nullValue,
   octetString,
   oid,
   sequence,
   set,
   utcTime,
   utf8String,
} from "../src/index.ts";

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

function buildTbsCertificate() {
   return sequence(
      integer(2),
      integer(12345),
      sequence(oid("1.2.840.113549.1.1.11")),
      sequence(
         set(sequence(oid("2.5.4.6"), utf8String("BR"))),
         set(sequence(oid("2.5.4.10"), utf8String("ICP-Brasil"))),
         set(sequence(oid("2.5.4.3"), utf8String("AC CERTISIGN MULTIPLA G6"))),
      ),
      sequence(
         utcTime(new Date("2024-01-01")),
         utcTime(new Date("2025-01-01")),
      ),
      sequence(
         set(sequence(oid("2.5.4.6"), utf8String("BR"))),
         set(sequence(oid("2.5.4.3"), utf8String("JOSE DA SILVA:12345678901"))),
      ),
      sequence(
         sequence(oid("1.2.840.113549.1.1.1"), nullValue()),
         bitString(new Uint8Array(256).fill(0xab)),
      ),
   );
}

function buildCmsSignedData() {
   return sequence(
      oid("1.2.840.113549.1.7.2"),
      contextTag(0, [
         sequence(
            integer(1),
            set(sequence(oid("2.16.840.1.101.3.4.2.1"), nullValue())),
            sequence(oid("1.2.840.113549.1.7.1")),
            set(
               sequence(
                  integer(1),
                  sequence(
                     sequence(oid("2.5.4.3"), utf8String("JOSE DA SILVA")),
                     integer(12345),
                  ),
                  sequence(oid("2.16.840.1.101.3.4.2.1"), nullValue()),
                  octetString(new Uint8Array(32).fill(0xde)),
                  bitString(new Uint8Array(256).fill(0xbb)),
               ),
            ),
         ),
      ]),
   );
}

test("performance: DER encode TBSCertificate-like structure", () => {
   const tbs = buildTbsCertificate();
   const result = benchmark(
      "encode-tbs-certificate",
      () => encodeDer(tbs),
      200,
   );

   console.log(formatResult(result));
   expect(result.avgMs).toBeLessThan(2);
});

test("performance: DER decode TBSCertificate-like structure", () => {
   const tbs = buildTbsCertificate();
   const encoded = encodeDer(tbs);
   const result = benchmark(
      "decode-tbs-certificate",
      () => decodeDer(encoded),
      200,
   );

   console.log(formatResult(result));
   expect(result.avgMs).toBeLessThan(2);
});

test("performance: DER encode CMS SignedData structure", () => {
   const signedData = buildCmsSignedData();
   const result = benchmark(
      "encode-cms-signed-data",
      () => encodeDer(signedData),
      100,
   );

   console.log(formatResult(result));
   expect(result.avgMs).toBeLessThan(5);
});

test("performance: DER decode CMS SignedData structure", () => {
   const signedData = buildCmsSignedData();
   const encoded = encodeDer(signedData);
   const result = benchmark(
      "decode-cms-signed-data",
      () => decodeDer(encoded),
      100,
   );

   console.log(formatResult(result));
   expect(result.avgMs).toBeLessThan(5);
});

test("performance: round-trip encode+decode (1000 iterations)", () => {
   const medium = sequence(
      integer(1),
      sequence(oid("1.2.840.113549.1.1.11"), nullValue()),
      sequence(
         set(sequence(oid("2.5.4.6"), utf8String("BR"))),
         set(sequence(oid("2.5.4.3"), utf8String("Test Subject"))),
      ),
      octetString(new Uint8Array(32).fill(0xaa)),
   );

   const result = benchmark(
      "roundtrip-encode-decode",
      () => {
         const encoded = encodeDer(medium);
         decodeDer(encoded);
      },
      1000,
   );

   console.log(formatResult(result));
   expect(result.avgMs).toBeLessThan(3);
});
