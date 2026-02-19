# @f-o-t/e-signature

PAdES PDF signing with ICP-Brasil compliance. Signs PDF documents using CMS/PKCS#7 SignedData format with support for visual signature appearance, QR codes, and RFC 3161 timestamps.

## Installation

```bash
bun add @f-o-t/e-signature
```

## Features

- Visual signature appearances preserve all original page fonts and resources
- Works with PDFs from @react-pdf/renderer with CIDFont fonts
- PAdES-BES and ICP-Brasil compliant signatures
- RFC 3161 timestamp support
- QR code generation for signature verification
- Configurable DocMDP permissions for document modification control
- **Browser compatible** — no `Buffer` or Node-only APIs; runs in browsers, Edge Runtime, and Cloudflare Workers

## React Hook

### `useSignPdf(): UseSignPdfReturn`

React hook for client-side PDF signing. Import from `@f-o-t/e-signature/plugins/react` (requires `react >= 18` as a peer dependency).

```tsx
import { useSignPdf } from "@f-o-t/e-signature/plugins/react";

function SignForm() {
  const { sign, isSigning, isDone, isError, result, error, download, reset } = useSignPdf();

  async function handleSubmit(pdfFile: File, p12File: File) {
    try {
      await sign({
        pdf: pdfFile,       // File, Blob, or Uint8Array
        p12: p12File,       // File, Blob, or Uint8Array
        password: "secret",
        options: { reason: "Approval", location: "São Paulo", policy: "pades-icp-brasil" },
      });
    } catch {
      // error state is also set on the hook
    }
  }

  if (isSigning) return <p>Signing…</p>;
  if (isError)   return <p>Error: {error?.message}</p>;
  if (isDone)    return <button onClick={() => download("signed.pdf")}>Download</button>;
  return <button onClick={() => handleSubmit(myPdf, myCert)}>Sign</button>;
}
```

**Return value:**

| Property | Type | Description |
|---|---|---|
| `status` | `"idle" \| "signing" \| "done" \| "error"` | Current lifecycle state |
| `isIdle` | `boolean` | No operation in progress |
| `isSigning` | `boolean` | Signing is running |
| `isDone` | `boolean` | Last sign call succeeded |
| `isError` | `boolean` | Last sign call failed |
| `result` | `Uint8Array \| null` | Signed PDF bytes (non-null when `isDone`) |
| `error` | `Error \| null` | Failure reason (non-null when `isError`) |
| `sign(input)` | `(SignInput) => Promise<Uint8Array \| undefined>` | Trigger signing; concurrent calls while signing are ignored (returns `undefined`) |
| `download(filename?)` | `(string?) => void` | Trigger browser download of signed PDF; no-op if not done |
| `reset()` | `() => void` | Return to idle, clearing result and error |

`pdf` and `p12` accept `File`, `Blob`, or `Uint8Array` — the hook converts `File`/`Blob` to `Uint8Array` automatically before calling `signPdf`.

## API

### `signPdf(pdf: Uint8Array | ReadableStream<Uint8Array>, options: PdfSignOptions): Promise<Uint8Array>`

Sign a PDF document with a digital certificate. Supports PAdES-BES and PAdES with ICP-Brasil compliance (signing-certificate-v2 and signature-policy attributes).

```ts
import { signPdf } from "@f-o-t/e-signature";

const pdfBytes = await Bun.file("document.pdf").bytes();
const p12 = await Bun.file("certificate.pfx").bytes();

const signedPdf = await signPdf(pdfBytes, {
  certificate: { p12, password: "secret" },
  reason: "Document approval",
  location: "Corporate Office",
  policy: "pades-icp-brasil",
  appearance: {
    x: 50,
    y: 50,
    width: 200,
    height: 80,
    page: 0,
  },
});

await Bun.write("signed.pdf", signedPdf);
```

To stamp multiple pages with the same visual appearance:

```ts
const signedPdf = await signPdf(pdfBytes, {
  certificate: { p12, password: "secret" },
  reason: "Document approval",
  appearances: [
    { x: 50, y: 730, width: 200, height: 80, page: 0, showCertInfo: true },
    { x: 50, y: 730, width: 200, height: 80, page: 1, showCertInfo: true },
    { x: 50, y: 730, width: 200, height: 80, page: 2, showCertInfo: true },
  ],
  qrCode: { data: "https://validar.iti.gov.br", size: 128 },
});
```

`appearance` and `appearances` can be used simultaneously — both stamps are rendered. An empty `appearances: []` is a no-op.

#### TSA Resilience

Control timeout, retry, and fallback behavior for timestamp requests:

```ts
const signedPdf = await signPdf(pdfBytes, {
  certificate: { p12, password: "secret" },
  timestamp: true,
  tsaUrl: TIMESTAMP_SERVERS.VALID,
  tsaTimeout: 5000,           // 5s per attempt (default: 10000)
  tsaRetries: 2,              // 2 retries after initial attempt, 3 total (default: 0)
  tsaFallbackUrls: [          // tried in order after primary fails
    TIMESTAMP_SERVERS.SAFEWEB,
    TIMESTAMP_SERVERS.CERTISIGN,
  ],
});
```

If all servers fail, a `TimestampError` is thrown with a descriptive message identifying which servers were tried and the last error.

#### Signing from a ReadableStream

```ts
const stream: ReadableStream<Uint8Array> = getFileStream("document.pdf");
const signedPdf = await signPdf(stream, {
  certificate: { p12, password: "secret" },
});
```

### `buildSigningCertificateV2(certDer: Uint8Array): Uint8Array`

Build the `id-aa-signingCertificateV2` attribute value (RFC 5035). Links the signature to the specific certificate used, preventing substitution attacks.

### `buildSignaturePolicy(): Promise<Uint8Array>`

Build the `id-aa-ets-sigPolicyId` attribute value. Downloads the ICP-Brasil PAdES signature policy and extracts the embedded hash. The policy document is cached after the first download.

### `clearPolicyCache(): void`

Clear the cached signature policy data, forcing a re-download on the next call.

### `requestTimestamp(data: Uint8Array, tsaUrl: string, hashAlgorithm?: "sha256" | "sha384" | "sha512", options?: { tsaTimeout?: number; tsaRetries?: number; tsaFallbackUrls?: string[] }): Promise<Uint8Array>`

Request an RFC 3161 timestamp from a TSA server. Returns the DER-encoded TimeStampToken.

```ts
import { requestTimestamp, TIMESTAMP_SERVERS } from "@f-o-t/e-signature";

const token = await requestTimestamp(signatureBytes, TIMESTAMP_SERVERS.VALID);
```

### `signPdfBatch(files: BatchSignInput[], options: PdfSignOptions): AsyncGenerator<BatchSignEvent>`

Sign multiple PDFs sequentially, yielding progress events. Yields control between each signing to prevent blocking the event loop.

```ts
import { signPdfBatch, signPdfBatchToArray, TIMESTAMP_SERVERS } from "@f-o-t/e-signature";

for await (const event of signPdfBatch(
  [
    { filename: "doc1.pdf", pdf: pdf1Bytes },
    { filename: "doc2.pdf", pdf: pdf2Bytes, options: { reason: "Custom reason" } },
  ],
  { certificate: { p12, password: "secret" } },
)) {
  switch (event.type) {
    case "file_start": console.log(`Signing ${event.filename}...`); break;
    case "file_complete": console.log(`Signed ${event.filename}`); break;
    case "file_error": console.error(`Failed ${event.filename}: ${event.error}`); break;
    case "batch_complete": console.log(`Done: ${event.totalFiles} files, ${event.errorCount} errors`); break;
  }
}
```

Per-file `options` are merged with the base options (per-file takes priority). Error in one file emits a `file_error` event and continues with the next file.

### `signPdfBatchToArray(files: BatchSignInput[], options: PdfSignOptions): Promise<...[]>`

Convenience wrapper that collects all results:

```ts
const results = await signPdfBatchToArray(
  [
    { filename: "doc1.pdf", pdf: pdf1Bytes },
    { filename: "doc2.pdf", pdf: pdf2Bytes },
  ],
  { certificate: { p12, password: "secret" } },
);

for (const r of results) {
  if (r.signed) await Bun.write(r.filename, r.signed);
  else console.error(`${r.filename}: ${r.error}`);
}
```

## Constants

### `ICP_BRASIL_OIDS`

OID constants for ICP-Brasil attributes:
- `signingCertificateV2` -- `"1.2.840.113549.1.9.16.2.47"`
- `signaturePolicy` -- `"1.2.840.113549.1.9.16.2.15"`

### `TIMESTAMP_SERVERS`

ICP-Brasil approved TSA server URLs:
- `VALID` -- `"http://timestamp.valid.com.br/tsa"`
- `SAFEWEB` -- `"http://tsa.safeweb.com.br/tsa/tsa"`
- `CERTISIGN` -- `"http://timestamp.certisign.com.br"`

### `TIMESTAMP_TOKEN_OID`

The `id-smime-aa-timeStampToken` OID: `"1.2.840.113549.1.9.16.2.14"`

## Types

```ts
type PdfSignOptions = {
  certificate: {
    p12: Uint8Array;
    password: string;
    name?: string;
  };
  reason?: string;
  location?: string;
  contactInfo?: string;
  policy?: "pades-ades" | "pades-icp-brasil";
  timestamp?: boolean;
  tsaUrl?: string;
  /** Timeout in ms per TSA attempt (default: 10000) */
  tsaTimeout?: number;
  /** Number of retry attempts after the initial TSA request fails (default: 0); total attempts = 1 + tsaRetries */
  tsaRetries?: number;
  /** Fallback TSA server URLs tried in order after primary is exhausted */
  tsaFallbackUrls?: string[];
  /** Called when timestamping fails (non-fatal). Receives the error for logging/metrics. */
  onTimestampError?: (error: unknown) => void;
  /** Single visual stamp (false to disable) */
  appearance?: SignatureAppearance | false;
  /** Multiple visual stamps — renders one per entry, useful for multi-page documents */
  appearances?: SignatureAppearance[];
  qrCode?: QrCodeConfig;
  docMdpPermission?: 1 | 2 | 3;
};

type SignatureAppearance = {
  x: number;
  y: number;
  width: number;
  height: number;
  page?: number;
  showQrCode?: boolean;
  showCertInfo?: boolean;
};

type QrCodeConfig = {
  data?: string;
  size?: number;
};

type BatchSignInput = {
  /** Filename for identification in events */
  filename: string;
  /** PDF content as Uint8Array or ReadableStream */
  pdf: Uint8Array | ReadableStream<Uint8Array>;
  /** Per-file option overrides merged with base options */
  options?: Partial<PdfSignOptions>;
};

type BatchSignEvent =
  | { type: "file_start"; fileIndex: number; filename: string }
  | { type: "file_complete"; fileIndex: number; filename: string; signed: Uint8Array }
  | { type: "file_error"; fileIndex: number; filename: string; error: string }
  | { type: "batch_complete"; totalFiles: number; errorCount: number };
```

## Error Classes

- `PdfSignError` -- Errors during PDF signing
- `SignaturePolicyError` -- Errors downloading or parsing the ICP-Brasil policy
- `TimestampError` -- Errors requesting timestamps from TSA servers

## Validation

The input schema is exported for use in your own validation:

```ts
import { pdfSignOptionsSchema } from "@f-o-t/e-signature";
```
