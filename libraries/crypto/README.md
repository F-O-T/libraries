# @f-o-t/crypto

PKCS#12 parsing, CMS/PKCS#7 SignedData construction, hashing, and PEM utilities. Built on `node:crypto` with zero external dependencies beyond `@f-o-t/asn1`.

## Installation

```bash
bun add @f-o-t/crypto
```

## API

### `parsePkcs12(data: Uint8Array, password: string): Pkcs12Result`

Parse a PKCS#12/PFX file and extract the certificate, private key, and certificate chain. Supports legacy PBE (3DES, RC2) and modern PBES2 (AES-CBC, PBKDF2) encryption schemes.

```ts
import { parsePkcs12 } from "@f-o-t/crypto";

const p12 = await Bun.file("certificate.pfx").bytes();
const { certificate, privateKey, chain } = parsePkcs12(p12, "password");
// certificate: Uint8Array (DER-encoded X.509)
// privateKey:  Uint8Array (DER-encoded PKCS#8)
// chain:       Uint8Array[] (CA certificates)
```

### `createSignedData(options: SignedDataOptions): Uint8Array`

Create a CMS/PKCS#7 SignedData structure wrapped in a ContentInfo. Returns DER-encoded bytes. Supports detached signatures (default) and custom authenticated/unauthenticated attributes.

```ts
import { createSignedData } from "@f-o-t/crypto";

const signedData = createSignedData({
  content: bytesToSign,
  certificate: cert,
  privateKey: key,
  chain: caCerts,
  hashAlgorithm: "sha256",
  detached: true,
});
```

### `hash(algorithm: HashAlgorithm, data: Uint8Array): Uint8Array`

Compute a cryptographic hash using `node:crypto`.

```ts
import { hash } from "@f-o-t/crypto";

const digest = hash("sha256", data);
```

### `pemToDer(pem: string): Uint8Array`

Convert a PEM-encoded string to DER bytes.

### `derToPem(der: Uint8Array, label: string): string`

Convert DER bytes to a PEM-encoded string with the given label (e.g. `"CERTIFICATE"`, `"PRIVATE KEY"`).

```ts
import { pemToDer, derToPem } from "@f-o-t/crypto";

const der = pemToDer(pemString);
const pem = derToPem(derBytes, "CERTIFICATE");
```

## Types

```ts
type HashAlgorithm = "sha256" | "sha384" | "sha512";

type Pkcs12Result = {
  certificate: Uint8Array; // DER-encoded X.509 cert
  privateKey: Uint8Array;  // DER-encoded PKCS#8 private key
  chain: Uint8Array[];     // CA certs in chain order
};

type CmsAttribute = {
  oid: string;
  values: Uint8Array[];    // DER-encoded attribute values
};

type SignedDataOptions = {
  content: Uint8Array;
  certificate: Uint8Array;
  privateKey: Uint8Array;
  chain?: Uint8Array[];
  hashAlgorithm?: HashAlgorithm;             // default: "sha256"
  authenticatedAttributes?: CmsAttribute[];
  unauthenticatedAttributes?: CmsAttribute[];
  detached?: boolean;                         // default: true
};
```

## Validation

Schemas are exported for use in your own validation:

```ts
import { hashAlgorithmSchema, signedDataOptionsSchema } from "@f-o-t/crypto";
```
