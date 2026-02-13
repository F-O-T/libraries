# In-House Crypto Stack & E-Signature Library

**Date:** 2026-02-13
**Status:** Design

## Motivation

`@f-o-t/digital-certificate` currently depends on 10 external packages (`node-forge`, `pdf-lib`, `axios`, `qrcode`, `@signpdf/*` x4, `asn1js`, `pkijs`). Six are unused, and the remaining four can be replaced with in-house `@f-o-t/*` libraries, aligning with the zero-external-deps philosophy.

Additionally, the PDF signing plugin handles a domain (e-signatures) that deserves its own library, separate from core certificate management.

## Architecture

### Dependency Graph

```
@f-o-t/asn1          (zod only)
    ↑
@f-o-t/crypto        (asn1 + node:crypto + zod)
    ↑
@f-o-t/e-signature   (crypto + digital-certificate + pdf + qrcode + zod)

@f-o-t/qrcode        (zod only)

@f-o-t/digital-certificate  (xml + zod + node:crypto)

@f-o-t/pdf           (zod only) — new "editing" plugin
```

Every library's only non-`@f-o-t` dependency is `zod`.

## New Libraries

### 1. `@f-o-t/asn1`

ASN.1 DER encoding/decoding. The foundation for all cryptographic structures.

**Public API:**

```ts
// Encoding/Decoding
encodeDer(node: Asn1Node): Uint8Array
decodeDer(data: Uint8Array): Asn1Node

// Builder helpers
sequence(...children: Asn1Node[]): Asn1Node
set(...children: Asn1Node[]): Asn1Node
integer(value: number | bigint): Asn1Node
oid(dotNotation: string): Asn1Node
octetString(data: Uint8Array): Asn1Node
bitString(data: Uint8Array): Asn1Node
utf8String(value: string): Asn1Node
ia5String(value: string): Asn1Node
printableString(value: string): Asn1Node
boolean(value: boolean): Asn1Node
nullValue(): Asn1Node
utcTime(date: Date): Asn1Node
generalizedTime(date: Date): Asn1Node
contextTag(tag: number, children: Asn1Node[], explicit?: boolean): Asn1Node

// OID utilities
oidToBytes(dotNotation: string): Uint8Array
bytesToOid(data: Uint8Array): string
```

**Core type:**

```ts
type Asn1Node = {
  tag: number
  constructed: boolean
  class: "universal" | "context" | "application" | "private"
  value: Uint8Array | Asn1Node[]
}
```

No classes. Pure functions. All `Uint8Array` (no Node.js `Buffer`).

---

### 2. `@f-o-t/crypto`

PKCS#12 parsing, PKCS#7/CMS signing, hashing. Built on `@f-o-t/asn1` + native `node:crypto`.

**Public API:**

```ts
// PKCS#12
parsePkcs12(data: Uint8Array, password: string): Pkcs12Result

type Pkcs12Result = {
  certificate: Uint8Array   // DER-encoded X.509 cert
  privateKey: Uint8Array     // DER-encoded private key
  chain: Uint8Array[]        // CA certs in chain
}

// PKCS#7/CMS SignedData
createSignedData(options: SignedDataOptions): Uint8Array

type SignedDataOptions = {
  content: Uint8Array
  certificate: Uint8Array
  privateKey: Uint8Array
  chain?: Uint8Array[]
  hashAlgorithm?: "sha256" | "sha384" | "sha512"
  authenticatedAttributes?: CmsAttribute[]
  unauthenticatedAttributes?: CmsAttribute[]
}

type CmsAttribute = {
  oid: string
  values: Uint8Array[]
}

// Hashing
hash(algorithm: "sha256" | "sha384" | "sha512", data: Uint8Array): Uint8Array

// PEM utilities
pemToDer(pem: string): Uint8Array
derToPem(der: Uint8Array, label: string): string
```

Key design: `CmsAttribute` allows `@f-o-t/e-signature` to inject ICP-Brasil attributes without `@f-o-t/crypto` knowing about Brazilian standards.

---

### 3. `@f-o-t/qrcode`

QR code generation to PNG buffer.

**Public API:**

```ts
generateQrCode(data: string, options?: QrCodeOptions): Uint8Array

type QrCodeOptions = {
  size?: number                              // default: 200
  errorCorrection?: "L" | "M" | "Q" | "H"   // default: "M"
  margin?: number                            // default: 4
}
```

PNG encoding implemented in-house using `node:zlib` for DEFLATE.

---

### 4. `@f-o-t/e-signature`

PAdES PDF signing with ICP-Brasil compliance.

**Public API:**

```ts
signPdf(pdf: Uint8Array, options: PdfSignOptions): Uint8Array

type PdfSignOptions = {
  certificate: CertificateInfo
  policy?: "pades-ades" | "pades-icp-brasil"
  timestamp?: boolean
  tsaUrl?: string
  appearance?: SignatureAppearance | false
  page?: number
}

type SignatureAppearance = {
  x: number
  y: number
  width: number
  height: number
  showQrCode?: boolean
  showCertInfo?: boolean
}

requestTimestamp(hash: Uint8Array, tsaUrl: string): Promise<Uint8Array>
buildSigningCertificateV2(cert: Uint8Array): Uint8Array
buildSignaturePolicy(policyOid: string): Uint8Array
```

**Internal flow of `signPdf`:**
1. Load PDF via `@f-o-t/pdf/plugins/editing`
2. Draw signature appearance + QR code via `@f-o-t/qrcode`
3. Save with signature placeholder (reserved byte range)
4. Hash byte ranges via `@f-o-t/crypto`
5. Build ICP-Brasil attributes (signing-certificate-v2, signature-policy)
6. Create PKCS#7 SignedData via `@f-o-t/crypto` with custom attributes
7. Optionally request TSA timestamp via native `fetch`
8. Inject signature bytes into placeholder

Uses native `fetch` for TSA communication (replaces `axios`).

## Modified Libraries

### `@f-o-t/pdf` — new `editing` plugin

```ts
// @f-o-t/pdf/plugins/editing
loadPdf(data: Uint8Array): PdfDocument

type PdfDocument = {
  pageCount: number
  getPage(index: number): PdfPage
  embedPng(data: Uint8Array): PdfImage
  save(): Uint8Array
  saveWithPlaceholder(options: SignaturePlaceholderOptions): {
    pdf: Uint8Array
    byteRange: [number, number, number, number]
  }
}

type PdfPage = {
  width: number
  height: number
  drawText(text: string, options: TextOptions): void
  drawRectangle(options: RectOptions): void
  drawImage(image: PdfImage, options: ImageOptions): void
}
```

### `@f-o-t/digital-certificate` — slimmed down

- **Remove:** `pdf-signer/` plugin (moves to `@f-o-t/e-signature`)
- **Remove deps:** `node-forge`, `pdf-lib`, `axios`, `qrcode`, `@signpdf/*` x4, `asn1js`, `pkijs`
- **Keep:** core cert parsing, `xml-signer` plugin, `mtls` plugin
- **Remaining deps:** `@f-o-t/xml`, `zod`

## Implementation Order

Build bottom-up, each lib tested before the next depends on it:

1. **`@f-o-t/asn1`** — zero deps, can build immediately
2. **`@f-o-t/crypto`** — depends on asn1
3. **`@f-o-t/qrcode`** — zero deps, can build in parallel with 1-2
4. **`@f-o-t/pdf/plugins/editing`** — extends existing lib
5. **`@f-o-t/e-signature`** — depends on all above
6. **Clean up `@f-o-t/digital-certificate`** — remove pdf-signer + external deps

## Deps Removed

| Package | Status |
|---|---|
| `node-forge` | Replaced by `@f-o-t/asn1` + `@f-o-t/crypto` |
| `pdf-lib` | Replaced by `@f-o-t/pdf/plugins/editing` |
| `axios` | Replaced by native `fetch` |
| `qrcode` | Replaced by `@f-o-t/qrcode` |
| `@signpdf/placeholder-pdfkit010` | Unused — removed |
| `@signpdf/placeholder-plain` | Unused — removed |
| `@signpdf/signpdf` | Unused — removed |
| `@signpdf/utils` | Unused — removed |
| `asn1js` | Unused — removed |
| `pkijs` | Unused — removed |
