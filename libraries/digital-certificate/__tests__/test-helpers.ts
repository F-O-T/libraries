/**
 * Test Helpers for Digital Certificate Testing
 *
 * Utilities for loading test and real certificates in tests
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CertificateInfo } from "../src/types.ts";
import { parseCertificate } from "../src/certificate.ts";

const fixturesDir = join(import.meta.dir, "fixtures");

export interface LoadCertificateOptions {
	/** Use real certificate instead of test certificate */
	useReal?: boolean;
	/** Password for the certificate (required if useReal is true) */
	password?: string;
	/** Path to custom certificate file */
	customPath?: string;
}

/**
 * Load a certificate for testing
 *
 * @param options - Certificate loading options
 * @returns Parsed certificate information
 *
 * @example
 * // Load test certificate (default)
 * const cert = loadCertificate();
 *
 * @example
 * // Load real certificate
 * const cert = loadCertificate({
 *   useReal: true,
 *   password: process.env.REAL_CERT_PASSWORD || 'your-password'
 * });
 */
export function loadCertificate(
	options: LoadCertificateOptions = {},
): CertificateInfo {
	const { useReal = false, password, customPath } = options;

	// Custom path provided
	if (customPath) {
		if (!existsSync(customPath)) {
			throw new Error(`Certificate file not found: ${customPath}`);
		}
		if (!password) {
			throw new Error("Password is required for custom certificate");
		}
		const pfx = readFileSync(customPath);
		return parseCertificate(pfx, password);
	}

	// Use real certificate
	if (useReal) {
		const realCertPath = join(fixturesDir, "real-certificate.pfx");
		const realPasswordPath = join(fixturesDir, "real-certificate.password.txt");

		if (!existsSync(realCertPath)) {
			throw new Error(
				`Real certificate not found at ${realCertPath}\n\n` +
					"To use your real certificate:\n" +
					"1. Copy your .pfx file to: libraries/digital-certificate/__tests__/fixtures/real-certificate.pfx\n" +
					"2. Provide the password via the 'password' option or create a file: real-certificate.password.txt\n",
			);
		}

		// Try to load password from file if not provided
		let certPassword = password;
		if (!certPassword && existsSync(realPasswordPath)) {
			certPassword = readFileSync(realPasswordPath, "utf-8").trim();
		}

		if (!certPassword) {
			throw new Error(
				"Password required for real certificate.\n" +
					"Either provide it via options.password or create a file: real-certificate.password.txt",
			);
		}

		const pfx = readFileSync(realCertPath);
		return parseCertificate(pfx, certPassword);
	}

	// Default: use test certificate
	const testCertPath = join(fixturesDir, "test-certificate.pfx");
	const testPassword = "test1234";
	const pfx = readFileSync(testCertPath);
	return parseCertificate(pfx, testPassword);
}

/**
 * Load raw P12/PFX buffer for PDF signing
 *
 * @param options - Certificate loading options
 * @returns Object with p12 buffer, password, and optional name
 *
 * @example
 * // Load test certificate P12
 * const { p12, password } = loadCertificateP12();
 *
 * @example
 * // Load real certificate P12
 * const { p12, password, name } = loadCertificateP12({ useReal: true });
 */
export function loadCertificateP12(
	options: LoadCertificateOptions = {},
): { p12: Buffer; password?: string; name?: string } {
	const { useReal = false, password, customPath } = options;

	// Custom path provided
	if (customPath) {
		if (!existsSync(customPath)) {
			throw new Error(`Certificate file not found: ${customPath}`);
		}
		const p12 = readFileSync(customPath);
		return { p12, password };
	}

	// Use real certificate
	if (useReal) {
		const realCertPath = join(fixturesDir, "real-certificate.pfx");
		const realPasswordPath = join(fixturesDir, "real-certificate.password.txt");
		
		if (!existsSync(realCertPath)) {
			throw new Error(`Real certificate not found at ${realCertPath}`);
		}
		
		const p12 = readFileSync(realCertPath);
		
		// Try to load password from file if not provided
		let certPassword = password;
		if (!certPassword && existsSync(realPasswordPath)) {
			certPassword = readFileSync(realPasswordPath, "utf-8").trim();
		}
		
		// Try to get the certificate name from parsed cert
		try {
			const cert = loadCertificate({ useReal: true, password: certPassword });
			return { p12, password: certPassword, name: cert.subject.commonName };
		} catch {
			return { p12, password: certPassword };
		}
	}

	// Default: use test certificate
	const testCertPath = join(fixturesDir, "test-certificate.pfx");
	const p12 = readFileSync(testCertPath);
	return { p12, password: "test1234", name: "Test Certificate" };
}

/**
 * Check if real certificate is available for testing
 */
export function hasRealCertificate(): boolean {
	const realCertPath = join(fixturesDir, "real-certificate.pfx");
	return existsSync(realCertPath);
}

/**
 * Get password for real certificate
 * Tries to load from file or environment variable
 */
export function getRealCertificatePassword(): string | null {
	// Try environment variable first
	if (process.env.REAL_CERT_PASSWORD) {
		return process.env.REAL_CERT_PASSWORD;
	}

	// Try password file
	const passwordPath = join(fixturesDir, "real-certificate.password.txt");
	if (existsSync(passwordPath)) {
		return readFileSync(passwordPath, "utf-8").trim();
	}

	return null;
}
