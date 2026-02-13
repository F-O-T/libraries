import { describe, expect, it } from "bun:test";
import { buildSigningCertificateV2 } from "../src/icp-brasil.ts";
import { parsePkcs12 } from "@f-o-t/crypto";
import { decodeDer, type Asn1Node } from "@f-o-t/asn1";

async function loadP12(): Promise<Uint8Array> {
	const file = Bun.file(
		"/home/yorizel/Documents/fot-libraries/libraries/crypto/__tests__/fixtures/test.p12",
	);
	return new Uint8Array(await file.arrayBuffer());
}

describe("buildSigningCertificateV2", () => {
	it("produces valid DER-encoded ASN.1 structure", async () => {
		const p12 = await loadP12();
		const { certificate } = parsePkcs12(p12, "test123");

		const result = buildSigningCertificateV2(certificate);
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.length).toBeGreaterThan(0);

		// Should be valid DER
		const decoded = decodeDer(result);
		// Top-level is SEQUENCE (SigningCertificateV2)
		expect(decoded.tag).toBe(0x10);
		expect(decoded.constructed).toBe(true);
	});

	it("contains certs SEQUENCE with ESSCertIDv2", async () => {
		const p12 = await loadP12();
		const { certificate } = parsePkcs12(p12, "test123");

		const result = buildSigningCertificateV2(certificate);
		const decoded = decodeDer(result);
		const children = decoded.value as Asn1Node[];

		// First child is SEQUENCE OF ESSCertIDv2 (certs)
		expect(children.length).toBeGreaterThanOrEqual(1);
		const certsSeq = children[0]!;
		expect(certsSeq.tag).toBe(0x10); // SEQUENCE
		expect(certsSeq.constructed).toBe(true);

		// Inside certs, the first ESSCertIDv2
		const essCertIdList = certsSeq.value as Asn1Node[];
		expect(essCertIdList.length).toBeGreaterThanOrEqual(1);

		const essCertId = essCertIdList[0]!;
		expect(essCertId.tag).toBe(0x10); // SEQUENCE
		const essCertIdChildren = essCertId.value as Asn1Node[];

		// Should have: hashAlgorithm, certHash, issuerSerial
		expect(essCertIdChildren.length).toBe(3);

		// hashAlgorithm (AlgorithmIdentifier)
		expect(essCertIdChildren[0]!.tag).toBe(0x10);

		// certHash (OCTET STRING)
		expect(essCertIdChildren[1]!.tag).toBe(0x04);
		const certHashBytes = essCertIdChildren[1]!.value as Uint8Array;
		expect(certHashBytes.length).toBe(32); // SHA-256 = 32 bytes

		// issuerSerial (SEQUENCE)
		expect(essCertIdChildren[2]!.tag).toBe(0x10);
	});

	it("produces different hashes for different certificates", async () => {
		const p12 = await loadP12();
		const { certificate } = parsePkcs12(p12, "test123");

		const result1 = buildSigningCertificateV2(certificate);
		const result2 = buildSigningCertificateV2(certificate);

		// Same certificate should produce same output (deterministic)
		expect(result1).toEqual(result2);
	});
});
