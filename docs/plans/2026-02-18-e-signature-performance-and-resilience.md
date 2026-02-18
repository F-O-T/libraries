# E-Signature Performance, Resilience & Streaming

**Date:** 2026-02-18
**Branch:** 1-e-signature-support-multiple-visual-signature-appearances-appearances-signatureappearance
**Scope:** `@f-o-t/e-signature` and its full dependency chain

---

## Problem

1. **TSA hangs on single signings** — `AbortSignal.timeout(10000)` is hardcoded; no retry; if ITI's TSA server is slow or unreachable the whole signing fails with an opaque `fetch failed` error.
2. **Bulk signing performance** — signing many PDFs in sequence blocks the event loop and accumulates TSA latency with no way to control timeouts, retries, or fallbacks.
3. **No performance regression guards** — none of the dependency libs have benchmark tests.

---

## Scope

Libraries to benchmark and improve:

| Library | Role in signing flow |
|---|---|
| `@f-o-t/asn1` | DER encode/decode for CMS structures |
| `@f-o-t/crypto` | PKCS#12 parse, RSA sign, SHA hash |
| `@f-o-t/digital-certificate` | P12 → parsed cert info, chain extraction |
| `@f-o-t/pdf` | Load PDF, insert placeholder, save |
| `@f-o-t/qrcode` | QR code generation for visual signatures |
| `@f-o-t/e-signature` | Orchestrates full signing flow |

---

## Part 1 — Performance Benchmarks

Each library gets `__tests__/performance.test.ts` following the existing `benchmark()` helper pattern (warmup + iterations, `toBeLessThan` guards).

### `@f-o-t/asn1`
- DER encode/decode of a `TBSCertificate` structure
- DER encode/decode of a CMS `SignedData` (the main structure e-signature builds)

### `@f-o-t/crypto`
- PKCS#12 parse (real `.p12` fixture)
- SHA-256 and SHA-512 hash of a 1 MB payload
- RSA-PKCS1v15 sign of a hash digest

### `@f-o-t/digital-certificate`
- Full P12 → parsed cert info round-trip (name, serial, validity, CN)
- Chain extraction from a multi-cert P12

### `@f-o-t/pdf`
- Load a 1-page PDF, insert a signature placeholder, save
- Scale test: load → save at 1, 5, and 20 pages

### `@f-o-t/qrcode`
- Generate QR for short, medium, and long data strings

### `@f-o-t/e-signature`
- Full sign: single page, no appearance, TSA mocked via `mock()`
- Full sign: with QR appearance
- Full sign: with `appearances` array across 5 pages
- Sequential signing: 10 PDFs in a loop (cumulative overhead)
- Memory scaling: sign 5 PDFs in sequence, assert heap delta stays reasonable

---

## Part 2 — TSA Resilience

### New options on `PdfSignOptions`

```ts
type PdfSignOptions = {
  // ...existing fields unchanged...

  tsaTimeout?: number;         // ms per attempt; default 10000
  tsaRetries?: number;         // retry attempts on primary before fallback; default 2
  tsaFallbackUrls?: string[];  // tried in order after primary exhausted
};
```

### Retry flow

```
attempt 1 → tsaUrl (tsaTimeout ms)
  ✓ success → embed timestamp
  ✗ fail → wait 1s
attempt 2 → tsaUrl (tsaTimeout ms)
  ✓ success → embed timestamp
  ✗ fail → wait 2s
attempt 3 → tsaFallbackUrls[0] (tsaTimeout ms)
  ✓ success → embed timestamp
  ✗ fail (no delay)
attempt 4 → tsaFallbackUrls[1] (tsaTimeout ms)
  ...
all fail → throw TimestampError("TSA request failed: all servers unreachable
  (primary: <url>, fallbacks: [<url>, ...]). Last error: <original>")
```

Exponential backoff between retries on the primary only (1s, 2s). No delay between fallback attempts since they are different servers.

### Error surfacing improvement

Wrap raw `fetch` errors so consumers see:
`"TSA server unreachable: <url> — fetch failed"`
instead of a naked `fetch failed`.

### Backward compatibility

All new options are optional. Existing behavior (1 attempt, 10s timeout, no fallback) is preserved unless the consumer opts in.

### Schema update

`pdfSignOptionsSchema` (Zod) gets the three new fields validated:
- `tsaTimeout`: `z.number().positive().optional()`
- `tsaRetries`: `z.number().int().min(1).optional()`
- `tsaFallbackUrls`: `z.array(z.string().url()).optional()`

---

## Part 3 — Streaming

### PDF input stream

`signPdf` is extended to accept `ReadableStream<Uint8Array>` in addition to `Uint8Array`. Internally accumulates all chunks then proceeds with signing (same as `parseStreamToArray` in CSV). Signing is inherently atomic so the output remains `Promise<Uint8Array>`.

```ts
// Before
export function signPdf(pdf: Uint8Array, options: PdfSignOptions): Promise<Uint8Array>

// After
export function signPdf(
  pdf: Uint8Array | ReadableStream<Uint8Array>,
  options: PdfSignOptions,
): Promise<Uint8Array>
```

### Batch signing stream — `signPdfBatch`

New function for signing multiple PDFs sequentially with yielded progress events. Yields control between each signing (`setTimeout(resolve, 0)`) to prevent blocking the event loop under bulk load.

```ts
type BatchSignInput = {
  filename: string;
  pdf: Uint8Array | ReadableStream<Uint8Array>;
  options?: Partial<PdfSignOptions>;  // per-file overrides; merged with base options
};

type BatchSignEvent =
  | { type: "file_start"; fileIndex: number; filename: string }
  | { type: "file_complete"; fileIndex: number; filename: string; signed: Uint8Array }
  | { type: "file_error"; fileIndex: number; filename: string; error: string }
  | { type: "batch_complete"; totalFiles: number; errorCount: number };

// Streaming — yields events per file
export async function* signPdfBatch(
  files: BatchSignInput[],
  options: PdfSignOptions,
): AsyncGenerator<BatchSignEvent>

// Convenience — collects all results
export async function signPdfBatchToArray(
  files: BatchSignInput[],
  options: PdfSignOptions,
): Promise<{ filename: string; signed: Uint8Array; error?: string }[]>
```

---

## Implementation Order

1. **Performance benchmarks** — add `performance.test.ts` to each lib (no API changes)
2. **TSA resilience** — update `timestamp.ts` + `types.ts` + `schemas.ts`
3. **Streaming input** — update `sign-pdf.ts` to accept `ReadableStream`
4. **Batch signing** — add `batch.ts` to e-signature, export from `index.ts`
5. **README + CHANGELOG** — update for all changed libs

---

## Files Changed

| File | Change |
|---|---|
| `libraries/asn1/__tests__/performance.test.ts` | New |
| `libraries/crypto/__tests__/performance.test.ts` | New |
| `libraries/digital-certificate/__tests__/performance.test.ts` | New |
| `libraries/pdf/__tests__/performance.test.ts` | New |
| `libraries/qrcode/__tests__/performance.test.ts` | New |
| `libraries/e-signature/__tests__/performance.test.ts` | New |
| `libraries/e-signature/src/timestamp.ts` | Add retry + fallback logic, better errors |
| `libraries/e-signature/src/types.ts` | Add `tsaTimeout`, `tsaRetries`, `tsaFallbackUrls` |
| `libraries/e-signature/src/schemas.ts` | Add Zod validation for new fields |
| `libraries/e-signature/src/sign-pdf.ts` | Accept `ReadableStream` input |
| `libraries/e-signature/src/batch.ts` | New — `signPdfBatch`, `signPdfBatchToArray` |
| `libraries/e-signature/src/index.ts` | Export batch functions and new types |
| `libraries/e-signature/README.md` | Document new options and batch API |
| `libraries/e-signature/CHANGELOG.md` | Document changes |
