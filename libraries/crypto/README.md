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

### `appendUnauthAttributes(signedDataDer: Uint8Array, attributes: CmsAttribute[]): Uint8Array`

Append unauthenticated attributes to an existing CMS SignedData DER without re-signing. Safe for non-deterministic algorithms (PSS, ECDSA).

```ts
import { appendUnauthAttributes } from "@f-o-t/crypto";

const updated = appendUnauthAttributes(originalSignedData, [
  { oid: "1.2.840.113549.1.9.16.2.14", values: [timestampTokenDer] },
]);
```

## Primitive APIs (advanced)

These low-level primitives are exported for use in performance-sensitive cryptographic code.

### `createHmac(alg: HashAlgorithm, key: Uint8Array): HmacContext`

Create a reusable HMAC context for a fixed key. For SHA-256, the ipad/opad block states are precomputed once so every subsequent `compute()` call skips the fixed-prefix block compression — this yields ~8× speedup when calling HMAC thousands of times (e.g. inside PBKDF2).

```ts
import { createHmac } from "@f-o-t/crypto";

const ctx = createHmac("sha256", key);
const mac1 = ctx.compute(data1);
const mac2 = ctx.compute(data2);
```

### `sha256ProcessBlock(block: Uint8Array): Uint32Array`

Process a single 64-byte SHA-256 block and return the resulting 8-word internal state. Used internally by `createHmac` to precompute the HMAC key schedule.

### `sha256WithState(initState: Uint32Array, data: Uint8Array, prefixLen: number): Uint8Array`

Compute SHA-256 starting from a pre-processed state `initState`, treating the first `prefixLen` bytes as already hashed. Used internally by `createHmac` to skip redundant block compressions.

### `HmacContext` interface

```ts
interface HmacContext {
  /** Compute HMAC over `data` using the precomputed key context. */
  compute(data: Uint8Array): Uint8Array;
}
```

## Validation

Schemas are exported for use in your own validation:

```ts
import { hashAlgorithmSchema, signedDataOptionsSchema } from "@f-o-t/crypto";
```
