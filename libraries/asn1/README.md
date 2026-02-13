# @f-o-t/asn1

ASN.1 DER encoding and decoding with builder helpers.

## Installation

```bash
bun add @f-o-t/asn1
```

## API

### `encodeDer(node: Asn1Node): Uint8Array`

Encode an ASN.1 node tree to DER format.

### `decodeDer(data: Uint8Array): Asn1Node`

Decode a DER-encoded byte array into an ASN.1 node tree.

### `oidToBytes(dotNotation: string): Uint8Array`

Convert an OID dot-notation string (e.g. `"1.2.840.113549"`) to DER value bytes.

### `bytesToOid(data: Uint8Array): string`

Convert DER OID value bytes back to dot-notation string.

### Builder Helpers

Convenience functions for constructing ASN.1 nodes:

| Function | Tag | Description |
|---|---|---|
| `sequence(...children)` | 0x10 | Constructed SEQUENCE |
| `set(...children)` | 0x11 | Constructed SET |
| `integer(value)` | 0x02 | INTEGER (number or bigint) |
| `oid(dotNotation)` | 0x06 | OBJECT IDENTIFIER |
| `octetString(data)` | 0x04 | OCTET STRING |
| `bitString(data, unusedBits?)` | 0x03 | BIT STRING |
| `utf8String(value)` | 0x0C | UTF8String |
| `ia5String(value)` | 0x16 | IA5String |
| `printableString(value)` | 0x13 | PrintableString |
| `boolean(value)` | 0x01 | BOOLEAN |
| `nullValue()` | 0x05 | NULL |
| `utcTime(date)` | 0x17 | UTCTime |
| `generalizedTime(date)` | 0x18 | GeneralizedTime |
| `contextTag(tag, children, explicit?)` | custom | Context-specific tag |

## Usage

```ts
import {
  encodeDer,
  decodeDer,
  sequence,
  integer,
  oid,
  octetString,
  utf8String,
  nullValue,
} from "@f-o-t/asn1";

// Build an ASN.1 structure
const node = sequence(
  oid("1.2.840.113549.1.1.11"),  // sha256WithRSAEncryption
  nullValue(),
);

// Encode to DER bytes
const der = encodeDer(node);

// Decode back to a node tree
const decoded = decodeDer(der);

console.log(decoded.tag);         // 0x10 (SEQUENCE)
console.log(decoded.constructed); // true
```

### Context Tags

```ts
import { contextTag, sequence, integer } from "@f-o-t/asn1";

// Explicit context tag [0] wrapping an integer
const explicit = contextTag(0, [integer(3)]);

// Implicit context tag [0] replacing the child's tag
const implicit = contextTag(0, [integer(3)], false);
```

## Types

```ts
type Asn1Class = "universal" | "context" | "application" | "private";

type Asn1Node = {
  tag: number;
  constructed: boolean;
  class: Asn1Class;
  value: Uint8Array | Asn1Node[];
};
```
