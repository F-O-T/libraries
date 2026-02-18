# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-02-18

### Added
- Performance benchmarks for DER encode/decode operations (`__tests__/performance.test.ts`)

## [1.0.0] - 2026-02-13

### Added
- ASN.1 DER encoder (`encodeDer`)
- ASN.1 DER decoder (`decodeDer`)
- Builder helpers: `sequence`, `set`, `integer`, `oid`, `octetString`, `bitString`, `utf8String`, `ia5String`, `printableString`, `boolean`, `nullValue`, `utcTime`, `generalizedTime`, `contextTag`
- OID utilities: `oidToBytes`, `bytesToOid`

[1.0.1]: https://github.com/F-O-T/libraries/compare/@f-o-t/asn1@1.0.0...@f-o-t/asn1@1.0.1
[1.0.0]: https://github.com/F-O-T/libraries/releases/tag/@f-o-t/asn1@1.0.0
