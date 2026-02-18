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

## API

### `signPdf(pdf: Uint8Array, options: PdfSignOptions): Promise<Uint8Array>`

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

### `buildSigningCertificateV2(certDer: Uint8Array): Uint8Array`

Build the `id-aa-signingCertificateV2` attribute value (RFC 5035). Links the signature to the specific certificate used, preventing substitution attacks.

### `buildSignaturePolicy(): Promise<Uint8Array>`

Build the `id-aa-ets-sigPolicyId` attribute value. Downloads the ICP-Brasil PAdES signature policy and extracts the embedded hash. The policy document is cached after the first download.

### `clearPolicyCache(): void`

Clear the cached signature policy data, forcing a re-download on the next call.

### `requestTimestamp(data: Uint8Array, tsaUrl: string, hashAlgorithm?: "sha256" | "sha384" | "sha512"): Promise<Uint8Array>`

Request an RFC 3161 timestamp from a TSA server. Returns the DER-encoded TimeStampToken.

```ts
import { requestTimestamp, TIMESTAMP_SERVERS } from "@f-o-t/e-signature";

const token = await requestTimestamp(signatureBytes, TIMESTAMP_SERVERS.VALID);
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
