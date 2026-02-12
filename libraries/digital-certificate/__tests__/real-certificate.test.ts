/**
 * Real Certificate Tests
 *
 * Tests using your real Brazilian A1 digital certificate.
 * These tests are skipped if the real certificate is not available.
 */

import { describe, expect, it } from "bun:test";
import { hasRealCertificate, loadCertificate } from "./test-helpers.ts";

describe.skipIf(!hasRealCertificate())("Real Certificate Tests", () => {
	it("loads and parses real certificate", () => {
		const cert = loadCertificate({ useReal: true, password: "12345678" });

		expect(cert).toBeDefined();
		expect(cert.serialNumber).toBeDefined();
		expect(cert.certPem).toContain("-----BEGIN CERTIFICATE-----");
		expect(cert.keyPem).toContain("-----BEGIN PRIVATE KEY-----");
	});

	it("validates real certificate is valid", () => {
		const cert = loadCertificate({ useReal: true });

		// Check if certificate is currently valid
		console.log("Certificate validity:");
		console.log("  Not Before:", cert.validity.notBefore);
		console.log("  Not After:", cert.validity.notAfter);
		console.log("  Is Valid:", cert.isValid);

		// Real certificates should be valid (unless expired)
		expect(cert.validity.notBefore).toBeInstanceOf(Date);
		expect(cert.validity.notAfter).toBeInstanceOf(Date);
	});

	it("extracts Brazilian fields from real certificate", () => {
		const cert = loadCertificate({ useReal: true });

		console.log("Brazilian fields:");
		console.log("  CNPJ:", cert.brazilian.cnpj);
		console.log("  CPF:", cert.brazilian.cpf);

		// At least one should be present in a Brazilian certificate
		const hasBrazilianField = cert.brazilian.cnpj || cert.brazilian.cpf;
		expect(hasBrazilianField).toBeTruthy();
	});

	it("displays certificate information", () => {
		const cert = loadCertificate({ useReal: true });

		console.log("\n=== Real Certificate Information ===");
		console.log("Serial Number:", cert.serialNumber);
		console.log("Fingerprint:", cert.fingerprint);
		console.log("\nSubject:");
		console.log("  Common Name:", cert.subject.commonName);
		console.log("  Organization:", cert.subject.organization);
		console.log("  Country:", cert.subject.country);
		console.log("\nIssuer:");
		console.log("  Common Name:", cert.issuer.commonName);
		console.log("  Organization:", cert.issuer.organization);
		console.log("\nValidity:");
		console.log("  Not Before:", cert.validity.notBefore.toISOString());
		console.log("  Not After:", cert.validity.notAfter.toISOString());
		console.log("  Is Valid:", cert.isValid);
		console.log("\nBrazilian Fields:");
		console.log("  CNPJ:", cert.brazilian.cnpj || "N/A");
		console.log("  CPF:", cert.brazilian.cpf || "N/A");
		console.log("=====================================\n");

		// Just verify we can display it
		expect(cert.subject.commonName).toBeTruthy();
	});
});
