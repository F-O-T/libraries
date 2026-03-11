/**
 * Structured error types for certificate parsing
 *
 * Error codes allow consumers to programmatically handle specific
 * failure modes without parsing error message strings.
 */

export type CertificateErrorCode =
	| "EMPTY_FILE"
	| "INVALID_FORMAT"
	| "WRONG_PASSWORD"
	| "UNSUPPORTED_ALGORITHM"
	| "NO_CERTIFICATE"
	| "NO_PRIVATE_KEY"
	| "CORRUPTED_FILE"
	| "X509_PARSE_FAILED"
	| "PEM_EXTRACTION_FAILED"
	| "UNKNOWN";

export class CertificateParseError extends Error {
	readonly code: CertificateErrorCode;

	constructor(
		code: CertificateErrorCode,
		message: string,
		options?: { cause?: unknown },
	) {
		super(message, options);
		this.name = "CertificateParseError";
		this.code = code;
	}
}

/**
 * Classify a low-level PKCS#12 or ASN.1 error into a structured error code.
 */
export function classifyPkcs12Error(message: string): {
	code: CertificateErrorCode;
	userMessage: string;
} {
	const lower = message.toLowerCase();

	if (lower.includes("mac verification failed") || lower.includes("wrong password")) {
		return {
			code: "WRONG_PASSWORD",
			userMessage: "Wrong certificate password. Please verify and try again.",
		};
	}

	if (lower.includes("unsupported pbe algorithm") || lower.includes("unsupported encryption scheme") || lower.includes("unsupported kdf") || lower.includes("unsupported cipher")) {
		// Extract the OID or algorithm name for the log
		const oidMatch = message.match(/:\s*(.+)$/);
		const detail = oidMatch?.[1] ?? "unknown";
		return {
			code: "UNSUPPORTED_ALGORITHM",
			userMessage: `Certificate uses an unsupported encryption algorithm (${detail}). Please contact support.`,
		};
	}

	if (lower.includes("no certificate found")) {
		return {
			code: "NO_CERTIFICATE",
			userMessage: "The file does not contain a certificate. Ensure you are uploading a valid .pfx/.p12 file.",
		};
	}

	if (lower.includes("no private key found")) {
		return {
			code: "NO_PRIVATE_KEY",
			userMessage: "The file does not contain a private key. Ensure you are uploading a valid A1 certificate (.pfx/.p12).",
		};
	}

	if (lower.includes("unable to decode asn.1") || lower.includes("invalid pkcs#12 data")) {
		return {
			code: "CORRUPTED_FILE",
			userMessage: "The file is corrupted or not a valid PKCS#12 certificate. Ensure the file was not truncated during upload.",
		};
	}

	if (lower.includes("unsupported pfx version")) {
		return {
			code: "INVALID_FORMAT",
			userMessage: "Unsupported certificate format version. Only PKCS#12 v3 files are supported.",
		};
	}

	return {
		code: "UNKNOWN",
		userMessage: `Certificate parsing failed: ${message}`,
	};
}
