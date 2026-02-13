# In-House Crypto Stack & E-Signature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all 10 external dependencies in `@f-o-t/digital-certificate` with in-house `@f-o-t/*` libraries and extract PDF signing into `@f-o-t/e-signature`.

**Architecture:** Bottom-up: asn1 → crypto (depends on asn1) | qrcode (parallel) → pdf editing plugin → e-signature → cleanup digital-certificate.

**Tech Stack:** TypeScript, Bun, Zod ^4.3.6, node:crypto, node:zlib

**Conventions (from CLAUDE.md):**
- Functional approach — public APIs export pure functions, not classes
- Classes only for Errors
- Zod for all input validation and type inference via `z.infer<>`
- Zero external deps — only `@f-o-t/*` packages + `zod`
- All `Uint8Array` (no Node.js `Buffer`)
- Tests use `bun:test` with `describe/it/expect`
- Tests in `__tests__/` directory with `.test.ts` extension

---

## Task 1: `@f-o-t/asn1` — ASN.1 DER Codec

**Goal:** Implement ASN.1 DER encoding/decoding with builder helpers. This is the foundation for all cryptographic structures.

**Files:**
- Create: `libraries/asn1/fot.config.ts`
- Create: `libraries/asn1/.npmignore`
- Create: `libraries/asn1/CHANGELOG.md`
- Create: `libraries/asn1/src/index.ts`
- Create: `libraries/asn1/src/types.ts`
- Create: `libraries/asn1/src/schemas.ts`
- Create: `libraries/asn1/src/encoder.ts`
- Create: `libraries/asn1/src/decoder.ts`
- Create: `libraries/asn1/src/builders.ts`
- Create: `libraries/asn1/src/oid.ts`
- Create: `libraries/asn1/__tests__/encoder.test.ts`
- Create: `libraries/asn1/__tests__/decoder.test.ts`
- Create: `libraries/asn1/__tests__/builders.test.ts`
- Create: `libraries/asn1/__tests__/oid.test.ts`
- Create: `libraries/asn1/__tests__/roundtrip.test.ts`

### Scaffold

```bash
cd /home/yorizel/Documents/fot-libraries && bun x --bun fot create asn1 "ASN.1 DER encoding and decoding"
```

Then replace generated files.

### `fot.config.ts`

```ts
import { defineFotConfig } from "@f-o-t/config";

export default defineFotConfig({
  external: ["zod"],
});
```

### `src/types.ts`

```ts
export type Asn1Class = "universal" | "context" | "application" | "private";

export type Asn1Node = {
  tag: number;
  constructed: boolean;
  class: Asn1Class;
  value: Uint8Array | Asn1Node[];
};
```

### `src/encoder.ts` — DER Encoding

Implement `encodeDer(node: Asn1Node): Uint8Array`:

1. Encode tag byte: class bits (2) + constructed bit (1) + tag number (5). For tags ≥ 31, use high-tag-number form.
2. Encode length: short form (< 128: single byte), long form (≥ 128: 0x80 | numBytes followed by length bytes).
3. Encode value: if `constructed`, recursively encode children and concatenate. If primitive, use raw bytes.

Tag class mapping: universal=0x00, application=0x40, context=0x80, private=0xC0.

### `src/decoder.ts` — DER Decoding

Implement `decodeDer(data: Uint8Array): Asn1Node`:

1. Read tag byte(s), extract class, constructed flag, tag number.
2. Read length (short/long form).
3. Read value bytes. If constructed, recursively decode children. If primitive, store as Uint8Array.

### `src/builders.ts` — Builder Helpers

Pure functions returning `Asn1Node`:

```ts
sequence(...children: Asn1Node[]): Asn1Node     // tag 0x10, constructed
set(...children: Asn1Node[]): Asn1Node           // tag 0x11, constructed
integer(value: number | bigint): Asn1Node        // tag 0x02, minimal two's complement
oid(dotNotation: string): Asn1Node               // tag 0x06
octetString(data: Uint8Array): Asn1Node          // tag 0x04
bitString(data: Uint8Array, unusedBits?: number): Asn1Node  // tag 0x03, prepend unused-bits byte
utf8String(value: string): Asn1Node              // tag 0x0C
ia5String(value: string): Asn1Node               // tag 0x16
printableString(value: string): Asn1Node         // tag 0x13
boolean(value: boolean): Asn1Node                // tag 0x01
nullValue(): Asn1Node                            // tag 0x05
utcTime(date: Date): Asn1Node                    // tag 0x17, format YYMMDDHHmmssZ
generalizedTime(date: Date): Asn1Node            // tag 0x18, format YYYYMMDDHHmmssZ
contextTag(tag: number, children: Asn1Node[], explicit?: boolean): Asn1Node
```

**INTEGER encoding rules:**
- Convert to minimal two's complement byte array
- If positive and high bit set, prepend 0x00
- BigInt: convert to bytes, strip leading zeros, add sign byte if needed

### `src/oid.ts` — OID Utilities

```ts
oidToBytes(dotNotation: string): Uint8Array
bytesToOid(data: Uint8Array): string
```

OID encoding:
- First two components: `40 * c[0] + c[1]` → single byte
- Remaining components: base-128 VLQ (variable-length quantity) with continuation bit (0x80)

### Tests

**encoder.test.ts:**
- Encode a SEQUENCE containing an INTEGER(1) and BOOLEAN(true), verify DER hex output matches expected bytes
- Encode NULL → `0x05 0x00`
- Encode INTEGER with negative value
- Encode long-form lengths (value > 127 bytes)
- Encode nested SEQUENCE

**decoder.test.ts:**
- Decode known DER bytes (e.g., X.509 certificate structures)
- Verify round-trip: decodeDer(encodeDer(node)) === node
- Handle malformed input (truncated, invalid length)

**builders.test.ts:**
- Each builder produces correct tag, class, constructed flag
- `integer(0)` → `0x02 0x01 0x00`
- `integer(127)` → `0x02 0x01 0x7F`
- `integer(128)` → `0x02 0x02 0x00 0x80`
- `integer(-128)` → `0x02 0x01 0x80`
- `oid("1.2.840.113549.1.1.11")` → correct DER OID bytes
- `contextTag(0, [...], true)` → explicit context tag [0]
- `contextTag(0, [...], false)` → implicit context tag [0]

**oid.test.ts:**
- Known OIDs: `2.5.4.3` (CN), `1.2.840.113549.1.1.11` (sha256WithRSAEncryption)
- Round-trip: bytesToOid(oidToBytes(str)) === str

**roundtrip.test.ts:**
- Build a mock X.509 TBSCertificate structure, encode, decode, verify equality

### Build & Test

```bash
cd /home/yorizel/Documents/fot-libraries/libraries/asn1 && bun x --bun fot build && bun x --bun fot test
```

### Commit

```bash
git add libraries/asn1/
git commit -m "feat(asn1): implement ASN.1 DER encoder, decoder, and builder helpers"
```

---

## Task 2: `@f-o-t/qrcode` — QR Code Generation

**Goal:** Generate QR codes as PNG buffers from string data. Implements ISO/IEC 18004 QR encoding with PNG output via `node:zlib`.

**Files:**
- Create: `libraries/qrcode/fot.config.ts`
- Create: `libraries/qrcode/.npmignore`
- Create: `libraries/qrcode/CHANGELOG.md`
- Create: `libraries/qrcode/src/index.ts`
- Create: `libraries/qrcode/src/types.ts`
- Create: `libraries/qrcode/src/schemas.ts`
- Create: `libraries/qrcode/src/encoder.ts` — data encoding (byte mode)
- Create: `libraries/qrcode/src/error-correction.ts` — Reed-Solomon
- Create: `libraries/qrcode/src/matrix.ts` — module placement
- Create: `libraries/qrcode/src/masking.ts` — mask pattern selection
- Create: `libraries/qrcode/src/png.ts` — PNG buffer output
- Create: `libraries/qrcode/__tests__/encoder.test.ts`
- Create: `libraries/qrcode/__tests__/integration.test.ts`

### Scaffold

```bash
cd /home/yorizel/Documents/fot-libraries && bun x --bun fot create qrcode "QR code generation to PNG buffer"
```

### Public API

```ts
generateQrCode(data: string, options?: QrCodeOptions): Uint8Array

type QrCodeOptions = {
  size?: number                              // default: 200
  errorCorrection?: "L" | "M" | "Q" | "H"   // default: "M"
  margin?: number                            // default: 4
}
```

### Implementation Notes

**QR Encoding (byte mode only is sufficient for our use case):**
1. Determine version (1-40) based on data length + error correction level
2. Encode data in byte mode (mode indicator 0100)
3. Add terminator, pad to fill capacity
4. Generate error correction codewords using Reed-Solomon over GF(2^8) with primitive polynomial 0x11D
5. Interleave data and EC codewords

**Matrix Placement:**
1. Create matrix with finder patterns (3 corners), alignment patterns, timing patterns
2. Place data bits in zigzag pattern from bottom-right
3. Add format information (EC level + mask)
4. Add version information (for versions ≥ 7)

**Masking:**
- Evaluate all 8 mask patterns using penalty rules
- Select pattern with lowest penalty score

**PNG Encoding:**
- PNG signature (8 bytes)
- IHDR chunk (width, height, bit depth=8, color type=2 RGB)
- IDAT chunk: filter each row (type 0 = None), deflate with `node:zlib`
- IEND chunk
- Each module → size×size pixels (black or white)

### Tests

**encoder.test.ts:**
- Encode "HELLO" in byte mode, verify codewords
- Version selection for various data lengths
- Error correction codeword generation

**integration.test.ts:**
- `generateQrCode("https://example.com")` returns valid PNG (check PNG signature bytes `0x89504E47`)
- Output respects `size` option (verify IHDR dimensions)
- Different error correction levels produce different outputs
- Empty string throws validation error
- Verify QR code is actually scannable by decoding the matrix pattern

### Build & Test

```bash
cd /home/yorizel/Documents/fot-libraries/libraries/qrcode && bun x --bun fot build && bun x --bun fot test
```

### Commit

```bash
git add libraries/qrcode/
git commit -m "feat(qrcode): implement QR code generation with PNG output"
```

---

## Task 3: `@f-o-t/crypto` — Cryptographic Operations

**Goal:** PKCS#12 parsing, CMS/PKCS#7 SignedData construction, hashing, PEM utilities. Built on `@f-o-t/asn1` + `node:crypto`.

**Depends on:** Task 1 (`@f-o-t/asn1`)

**Files:**
- Create: `libraries/crypto/fot.config.ts`
- Create: `libraries/crypto/.npmignore`
- Create: `libraries/crypto/CHANGELOG.md`
- Create: `libraries/crypto/src/index.ts`
- Create: `libraries/crypto/src/types.ts`
- Create: `libraries/crypto/src/schemas.ts`
- Create: `libraries/crypto/src/hash.ts`
- Create: `libraries/crypto/src/pem.ts`
- Create: `libraries/crypto/src/pkcs12.ts`
- Create: `libraries/crypto/src/cms.ts`
- Create: `libraries/crypto/__tests__/hash.test.ts`
- Create: `libraries/crypto/__tests__/pem.test.ts`
- Create: `libraries/crypto/__tests__/pkcs12.test.ts`
- Create: `libraries/crypto/__tests__/cms.test.ts`

### Scaffold

```bash
cd /home/yorizel/Documents/fot-libraries && bun x --bun fot create crypto "PKCS#12 parsing, CMS signing, and cryptographic utilities"
```

### `fot.config.ts`

```ts
import { defineFotConfig } from "@f-o-t/config";

export default defineFotConfig({
  external: ["zod", "@f-o-t/asn1"],
});
```

### Public API

```ts
// PKCS#12
parsePkcs12(data: Uint8Array, password: string): Pkcs12Result

type Pkcs12Result = {
  certificate: Uint8Array   // DER-encoded X.509 cert
  privateKey: Uint8Array     // DER-encoded private key
  chain: Uint8Array[]        // CA certs in chain
}

// CMS/PKCS#7 SignedData
createSignedData(options: SignedDataOptions): Uint8Array

type SignedDataOptions = {
  content: Uint8Array
  certificate: Uint8Array
  privateKey: Uint8Array
  chain?: Uint8Array[]
  hashAlgorithm?: "sha256" | "sha384" | "sha512"
  authenticatedAttributes?: CmsAttribute[]
  unauthenticatedAttributes?: CmsAttribute[]
  detached?: boolean
}

type CmsAttribute = {
  oid: string
  values: Uint8Array[]  // DER-encoded attribute values
}

// Hashing
hash(algorithm: "sha256" | "sha384" | "sha512", data: Uint8Array): Uint8Array

// PEM utilities
pemToDer(pem: string): Uint8Array
derToPem(der: Uint8Array, label: string): string
```

### Implementation Notes

**`hash.ts`** — Thin wrapper around `node:crypto.createHash()`. Converts between Uint8Array and Node crypto.

**`pem.ts`** — Parse PEM format: strip `-----BEGIN/END <label>-----` lines, base64-decode middle. Reverse for derToPem.

**`pkcs12.ts`** — PKCS#12 parsing using `@f-o-t/asn1`:
1. Decode outer PFX PDU (SEQUENCE of version, authSafe, macData)
2. Parse authSafe ContentInfo → PKCS#7 Data containing AuthenticatedSafe
3. Each ContentInfo in AuthenticatedSafe is either:
   - PKCS#7 Data (unencrypted) containing SafeBag[]
   - PKCS#7 EncryptedData containing SafeBag[]
4. For EncryptedData: derive key via PKCS#12 KDF using password and salt, decrypt with `node:crypto`
5. Parse SafeBags: CertBag (contains X.509 cert), PKCS8ShroudedKeyBag (encrypted private key)
6. For PKCS8ShroudedKeyBag: decrypt using PKCS#12 KDF, extract raw private key DER
7. Verify MAC if present (HMAC using PKCS#12 KDF)

Common encryption algorithms in PKCS#12:
- `1.2.840.113549.1.12.1.3` — pbeWithSHAAnd3-KeyTripleDES-CBC
- `1.2.840.113549.1.12.1.6` — pbeWithSHAAnd40BitRC2-CBC
- `2.16.840.1.101.3.4.1.42` — AES-256-CBC (modern P12s)

PKCS#12 KDF (RFC 7292 Appendix B):
- Uses SHA-1 by default
- Takes password (BMPString encoded), salt, iterations, purpose byte (1=key, 2=iv, 3=mac)

**`cms.ts`** — CMS SignedData construction:
1. Build authenticated attributes: always include contentType + messageDigest
2. Append any custom `authenticatedAttributes` from options
3. DER-encode attrs with SET tag (0x31) for hash computation
4. Hash the DER-encoded attributes using `node:crypto`
5. Sign the hash with private key using `node:crypto.sign()` with RSA-PKCS1v15
6. Build SignerInfo: version, issuerAndSerialNumber (from cert), digestAlgorithm, signedAttrs [0] IMPLICIT, signatureAlgorithm, signature, unsignedAttrs [1] IMPLICIT (optional)
7. Build SignedData: version, digestAlgorithms SET, encapContentInfo (detached if `detached: true`), certificates [0] IMPLICIT, signerInfos SET
8. Wrap in ContentInfo with OID `1.2.840.113549.1.7.2`
9. Encode to DER via `@f-o-t/asn1`

Key: the `CmsAttribute` type allows callers (e.g., e-signature) to inject custom attributes without crypto knowing about ICP-Brasil.

### Tests

**hash.test.ts:**
- SHA-256 of empty string matches known hash
- SHA-256 of "hello" matches known hash
- SHA-512 produces 64-byte output

**pem.test.ts:**
- Round-trip: derToPem(pemToDer(pem)) preserves data
- Parse real PEM certificate
- Handle Windows/Unix line endings

**pkcs12.test.ts:**
- Parse test .p12 file (reuse fixture from digital-certificate: `__tests__/fixtures/`)
- Extract certificate, private key, and chain
- Wrong password throws error
- Corrupted data throws error

**cms.test.ts:**
- Create SignedData with test certificate
- Verify DER output starts with ContentInfo SEQUENCE + SignedData OID
- Custom attributes appear in the SignerInfo authenticatedAttributes
- Detached mode omits eContent

### Build & Test

```bash
cd /home/yorizel/Documents/fot-libraries/libraries/crypto && bun x --bun fot build && bun x --bun fot test
```

### Commit

```bash
git add libraries/crypto/
git commit -m "feat(crypto): implement PKCS#12 parser, CMS SignedData builder, and crypto utilities"
```

---

## Task 4: `@f-o-t/pdf` Editing Plugin

**Goal:** Add an `editing` plugin to the existing `@f-o-t/pdf` library that can load, modify, and save existing PDFs.

**Depends on:** Existing `@f-o-t/pdf` library

**Files:**
- Create: `libraries/pdf/src/plugins/editing/index.ts`
- Create: `libraries/pdf/src/plugins/editing/parser.ts`
- Create: `libraries/pdf/src/plugins/editing/document.ts`
- Create: `libraries/pdf/src/plugins/editing/page.ts`
- Create: `libraries/pdf/src/plugins/editing/types.ts`
- Create: `libraries/pdf/__tests__/editing.test.ts`
- Modify: `libraries/pdf/fot.config.ts` — add `"editing"` to plugins array
- Modify: `libraries/pdf/package.json` — remove `@f-o-t/digital-certificate` dependency

### Public API

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

type SignaturePlaceholderOptions = {
  reason?: string
  name?: string
  location?: string
  contactInfo?: string
  signatureLength?: number
  docMdpPermission?: 1 | 2 | 3
}
```

### Implementation Notes

**PDF Parser** (`parser.ts`):
- Parse existing PDF structure: header, cross-reference table, trailer
- Resolve object references
- Handle both traditional xref tables and xref streams
- Extract page tree
- This is the most complex part — PDF parsing is intricate

**Document** (`document.ts`):
- Wraps parsed PDF
- Provides `getPage()` to access existing pages
- `embedPng()`: create XObject from PNG data
- `save()`: write modified PDF using incremental update (append new/changed objects)
- `saveWithPlaceholder()`: same as save but adds signature dictionary with placeholder

**Page** (`page.ts`):
- `drawText()`: append text operators to page content stream
- `drawRectangle()`: append rectangle operators
- `drawImage()`: append image XObject reference

**Signature Placeholder**: Port logic from `digital-certificate/src/plugins/pdf-signer/pdf-placeholder.ts` — it already works with raw buffers. Adapt to use Uint8Array instead of Buffer.

### Tests

**editing.test.ts:**
- Load a minimal valid PDF, verify pageCount
- Get page dimensions
- Draw text on page, save, verify output is valid PDF
- Draw rectangle on page
- Embed PNG image and draw on page
- `saveWithPlaceholder()` produces PDF with /ByteRange and /Contents placeholder
- Round-trip: loadPdf(save()) preserves content

### Build & Test

```bash
cd /home/yorizel/Documents/fot-libraries/libraries/pdf && bun x --bun fot build && bun x --bun fot test
```

### Commit

```bash
git add libraries/pdf/
git commit -m "feat(pdf): add editing plugin for loading and modifying existing PDFs"
```

---

## Task 5: `@f-o-t/e-signature` — PAdES PDF Signing

**Goal:** Extract PDF signing from digital-certificate into dedicated library with ICP-Brasil PAdES compliance.

**Depends on:** Tasks 1-4

**Files:**
- Create: `libraries/e-signature/fot.config.ts`
- Create: `libraries/e-signature/.npmignore`
- Create: `libraries/e-signature/CHANGELOG.md`
- Create: `libraries/e-signature/src/index.ts`
- Create: `libraries/e-signature/src/types.ts`
- Create: `libraries/e-signature/src/schemas.ts`
- Create: `libraries/e-signature/src/sign-pdf.ts`
- Create: `libraries/e-signature/src/icp-brasil.ts`
- Create: `libraries/e-signature/src/timestamp.ts`
- Create: `libraries/e-signature/src/appearance.ts`
- Create: `libraries/e-signature/src/byte-range.ts`
- Create: `libraries/e-signature/__tests__/sign-pdf.test.ts`
- Create: `libraries/e-signature/__tests__/icp-brasil.test.ts`
- Create: `libraries/e-signature/__tests__/byte-range.test.ts`

### `fot.config.ts`

```ts
import { defineFotConfig } from "@f-o-t/config";

export default defineFotConfig({
  external: ["zod", "@f-o-t/asn1", "@f-o-t/crypto", "@f-o-t/qrcode", "@f-o-t/pdf", "@f-o-t/digital-certificate"],
});
```

### Public API

```ts
signPdf(pdf: Uint8Array, options: PdfSignOptions): Promise<Uint8Array>

type PdfSignOptions = {
  certificate: CertificateInfo  // from @f-o-t/digital-certificate
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

// ICP-Brasil helpers (exported for advanced use)
buildSigningCertificateV2(certDer: Uint8Array): Uint8Array
buildSignaturePolicy(policyOid: string): Promise<Uint8Array>
requestTimestamp(hash: Uint8Array, tsaUrl: string): Promise<Uint8Array>
```

### Implementation Notes

**`sign-pdf.ts`** — Main signing flow (port from `digital-certificate/src/plugins/pdf-signer/index.ts`):
1. Load PDF via `@f-o-t/pdf/plugins/editing`
2. Draw signature appearance + QR code if requested
3. Save with signature placeholder
4. Find ByteRange, update it, extract bytes to sign
5. Build ICP-Brasil attributes (if `pades-icp-brasil` policy)
6. Create PKCS#7 SignedData via `@f-o-t/crypto` with custom attributes
7. Optionally request TSA timestamp
8. Embed signature bytes into placeholder

**`icp-brasil.ts`** — Port from `signing-certificate.ts` + `signature-policy.ts`:
- `buildSigningCertificateV2()`: uses `@f-o-t/asn1` to build the attribute structure
- `buildSignaturePolicy()`: fetches PA_PAdES_AD_RB_v1_1 policy from ITI, parses with `@f-o-t/asn1`

**`timestamp.ts`** — Port from `timestamp-client.ts`:
- Uses native `fetch` instead of `axios`
- Creates RFC 3161 TimeStampReq using `@f-o-t/asn1`
- Extracts TimeStampToken from response

**`appearance.ts`** — Port from `signature-appearance.ts`:
- Uses `@f-o-t/pdf/plugins/editing` instead of `pdf-lib`
- Uses `@f-o-t/qrcode` instead of `qrcode` npm package

**`byte-range.ts`** — Port from `pdf-signature-utils.ts`:
- Convert from Buffer to Uint8Array
- `findByteRange()`, `extractBytesToSign()`, `updateByteRangeInPDF()`, `embedSignatureOnly()`

### Tests

**sign-pdf.test.ts:**
- Sign a minimal PDF with test certificate
- Verify output is valid PDF with embedded signature
- Verify ByteRange is correctly set
- Verify PKCS#7 structure is present

**icp-brasil.test.ts:**
- `buildSigningCertificateV2()` produces valid ASN.1 structure
- DER decode and verify OID, hash algorithm, cert hash presence

**byte-range.test.ts:**
- `findByteRange()` on PDF with placeholder
- `extractBytesToSign()` concatenates correct ranges
- `embedSignatureOnly()` replaces placeholder

### Build & Test

```bash
cd /home/yorizel/Documents/fot-libraries/libraries/e-signature && bun x --bun fot build && bun x --bun fot test
```

### Commit

```bash
git add libraries/e-signature/
git commit -m "feat(e-signature): implement PAdES PDF signing with ICP-Brasil compliance"
```

---

## Task 6: Clean Up `@f-o-t/digital-certificate`

**Goal:** Remove the pdf-signer plugin and all 10 external dependencies from digital-certificate.

**Depends on:** Task 5

**Files:**
- Delete: `libraries/digital-certificate/src/plugins/pdf-signer/` (entire directory)
- Modify: `libraries/digital-certificate/package.json` — remove external deps, remove pdf-signer export
- Modify: `libraries/digital-certificate/fot.config.ts` — remove pdf-signer from plugins, clean external list
- Modify: `libraries/digital-certificate/CHANGELOG.md` — document breaking changes
- Delete: related test files for pdf-signer

### Steps

1. Remove `src/plugins/pdf-signer/` directory entirely
2. Update `package.json`:
   - Remove from dependencies: `node-forge`, `pdf-lib`, `axios`, `qrcode`, `@signpdf/*` (4), `asn1js`, `pkijs`
   - Remove from devDependencies: `@types/qrcode`
   - Keep: `@f-o-t/xml`, `zod`
   - Bump version to `2.0.0` (breaking: removed pdf-signer plugin)
3. Update `fot.config.ts`:
   - Remove `pdf-signer` from plugins
   - Remove external entries for removed packages
4. Update `CHANGELOG.md`:
   - Add `[2.0.0]` section
   - Under "Removed": pdf-signer plugin (moved to `@f-o-t/e-signature`), all external deps
5. Remove pdf-signer test files
6. Build and test to ensure core functionality still works

### Build & Test

```bash
cd /home/yorizel/Documents/fot-libraries/libraries/digital-certificate && bun x --bun fot build && bun x --bun fot test
```

### Commit

```bash
git add libraries/digital-certificate/
git commit -m "feat(digital-certificate)!: remove pdf-signer plugin and all external dependencies

BREAKING CHANGE: The pdf-signer plugin has been moved to @f-o-t/e-signature.
Removed dependencies: node-forge, pdf-lib, axios, qrcode, @signpdf/* (4), asn1js, pkijs."
```

---

## Parallelization Strategy

```
Wave 1 (parallel):  Task 1 (@f-o-t/asn1)  +  Task 2 (@f-o-t/qrcode)
Wave 2 (sequential): Task 3 (@f-o-t/crypto) — depends on asn1
Wave 3 (parallel):  Task 4 (pdf editing)   — can start after qrcode, independent of crypto
Wave 4 (sequential): Task 5 (@f-o-t/e-signature) — depends on all above
Wave 5 (sequential): Task 6 (cleanup) — depends on e-signature
```
