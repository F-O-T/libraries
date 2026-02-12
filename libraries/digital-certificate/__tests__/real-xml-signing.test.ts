/**
 * Real Certificate XML Signing Tests
 *
 * Test signing XML documents with your real Brazilian A1 certificate
 */

import { describe, expect, it } from "bun:test";
import { signXml } from "../src/plugins/xml-signer/index.ts";
import { hasRealCertificate, loadCertificate } from "./test-helpers.ts";

const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="http://example.org/schema">
  <Data Id="doc_123">
    <Field1>Test Value</Field1>
    <Field2>Another Value</Field2>
  </Data>
</Document>`;

describe.skipIf(!hasRealCertificate())("Real Certificate - XML Signing", () => {
	const cert = loadCertificate({ useReal: true });

	it("signs XML document with real certificate", () => {
		const signed = signXml(sampleXml, {
			certificate: cert,
			referenceUri: "#doc_123",
			algorithm: "sha256",
		});

		expect(signed).toContain("<Signature");
		expect(signed).toContain("</Signature>");
		expect(signed).toContain("<SignedInfo");
		expect(signed).toContain("<SignatureValue>");
		expect(signed).toContain("<DigestValue>");
		expect(signed).toContain("<X509Certificate>");

		console.log("\n✅ Successfully signed XML with real certificate!");
		console.log("Signature contains:");
		console.log("  - SignedInfo ✓");
		console.log("  - SignatureValue ✓");
		console.log("  - DigestValue ✓");
		console.log("  - X509Certificate ✓\n");
	});

	it("includes real certificate in signature", () => {
		const signed = signXml(sampleXml, {
			certificate: cert,
			referenceUri: "#doc_123",
		});

		// The signed XML should contain the actual certificate
		expect(signed).toContain("<X509Certificate>");

		// Extract certificate from signature
		const certMatch = signed.match(
			/<X509Certificate>([^<]+)<\/X509Certificate>/,
		);
		expect(certMatch).toBeTruthy();

		console.log("\n✅ Real certificate embedded in signature");
		console.log(`Certificate data length: ${certMatch?.[1]?.length || 0} characters\n`);
	});

	it("produces valid signature structure with SHA-256", () => {
		const signed = signXml(sampleXml, {
			certificate: cert,
			referenceUri: "#doc_123",
			algorithm: "sha256",
		});

		// Check for SHA-256 algorithm URIs
		expect(signed).toContain("rsa-sha256");
		expect(signed).toContain("xmlenc#sha256");
		expect(signed).toContain("xml-exc-c14n#");
		expect(signed).toContain("xmldsig#enveloped-signature");

		console.log("\n✅ Signature uses correct SHA-256 algorithms");
		console.log("  - RSA-SHA256 ✓");
		console.log("  - Exclusive C14N ✓");
		console.log("  - Enveloped Signature Transform ✓\n");
	});

	it("preserves original content in signed document", () => {
		const signed = signXml(sampleXml, {
			certificate: cert,
			referenceUri: "#doc_123",
		});

		expect(signed).toContain("<Field1>Test Value</Field1>");
		expect(signed).toContain("<Field2>Another Value</Field2>");
		expect(signed).toContain('Id="doc_123"');

		console.log("\n✅ Original document content preserved in signed XML\n");
	});

	it("displays signed XML preview", () => {
		const signed = signXml(sampleXml, {
			certificate: cert,
			referenceUri: "#doc_123",
			algorithm: "sha256",
		});

		console.log("\n=== Signed XML Preview ===");
		console.log(signed.substring(0, 500) + "...\n");
		console.log(`Total signed XML length: ${signed.length} characters\n`);
		console.log("==========================\n");

		expect(signed.length).toBeGreaterThan(sampleXml.length);
	});
});
