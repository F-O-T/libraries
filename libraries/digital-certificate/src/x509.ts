/**
 * X.509 Certificate Parser
 *
 * Pure JavaScript X.509 parser using @f-o-t/asn1
 * Replaces crypto.X509Certificate (which requires OpenSSL)
 * Works in Bun without OpenSSL dependency
 */

import { decodeDer, bytesToOid, type Asn1Node } from "@f-o-t/asn1";
import { hash } from "@f-o-t/crypto";

// X.509 OIDs
const OID_COMMON_NAME = "2.5.4.3";
const OID_COUNTRY = "2.5.4.6";
const OID_LOCALITY = "2.5.4.7";
const OID_STATE = "2.5.4.8";
const OID_ORGANIZATION = "2.5.4.10";
const OID_ORGANIZATIONAL_UNIT = "2.5.4.11";
const OID_SUBJECT_ALT_NAME = "2.5.29.17";

export interface X509Info {
	serialNumber: string;
	subject: {
		commonName: string | null;
		organization: string | null;
		organizationalUnit: string | null;
		country: string | null;
		state: string | null;
		locality: string | null;
		raw: string;
	};
	issuer: {
		commonName: string | null;
		organization: string | null;
		country: string | null;
		raw: string;
	};
	validity: {
		notBefore: Date;
		notAfter: Date;
	};
	fingerprint: string;
	subjectAltName: string | null;
}

/**
 * Parse an X.509 certificate from PEM format
 */
export function parseX509Certificate(certPem: string): X509Info {
	// Extract base64 from PEM
	const b64 = certPem
		.replace(/-----BEGIN CERTIFICATE-----/, "")
		.replace(/-----END CERTIFICATE-----/, "")
		.replace(/\s/g, "");

	const der = new Uint8Array(Buffer.from(b64, "base64"));

	// Calculate fingerprint (SHA-256 hash of DER)
	const fingerprintBytes = hash("sha256", der);
	const fingerprint = Array.from(fingerprintBytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	// Parse ASN.1 structure
	const cert = decodeDer(der);
	// ASN.1 SEQUENCE is tag 0x10 (16), constructed bit is stored separately
	if (cert.tag !== 0x10 || !cert.constructed) {
		throw new Error("Invalid X.509 certificate: expected SEQUENCE");
	}

	const certSeq = cert.value as Asn1Node[];
	if (!certSeq || certSeq.length < 3) {
		throw new Error("Invalid X.509 certificate: missing required fields");
	}

	// TBSCertificate is first element
	const tbsCert = certSeq[0];
	if (!tbsCert || !tbsCert.constructed || !Array.isArray(tbsCert.value)) {
		throw new Error("Invalid TBSCertificate");
	}

	const tbs = tbsCert.value as Asn1Node[];
	let idx = 0;

	// Optional version [0] EXPLICIT (context tag 0)
	if (tbs[idx]?.class === "context" && tbs[idx]?.tag === 0) {
		idx++; // Skip version
	}

	// Serial number (INTEGER, tag 0x02)
	const serialNode = tbs[idx++];
	if (!serialNode || serialNode.tag !== 0x02) {
		throw new Error("Missing or invalid serial number");
	}
	const serialNumber = bytesToHex(serialNode.value as Uint8Array);

	// Signature algorithm (SEQUENCE, tag 0x10)
	if (tbs[idx]?.tag !== 0x10) {
		throw new Error("Expected signature algorithm SEQUENCE");
	}
	idx++; // Skip signature algorithm

	// Issuer (Name - SET/SEQUENCE, tag 0x10 or 0x11)
	const issuerNode = tbs[idx++];
	if (!issuerNode) throw new Error("Missing issuer");
	const issuer = parseName(issuerNode);

	// Validity (SEQUENCE, tag 0x10)
	const validityNode = tbs[idx++];
	if (!validityNode || validityNode.tag !== 0x10) {
		throw new Error(`Missing or invalid validity (got tag ${validityNode?.tag})`);
	}
	const validity = parseValidity(validityNode);

	// Subject (Name - SET/SEQUENCE)
	const subjectNode = tbs[idx++];
	if (!subjectNode) throw new Error("Missing subject");
	const subject = parseName(subjectNode);

	// Subject Public Key Info
	idx++; // Skip public key

	// Optional extensions
	let subjectAltName: string | null = null;
	while (idx < tbs.length) {
		const node = tbs[idx];
		if (node?.tag === 0xa3) {
			// [3] EXPLICIT - extensions
			subjectAltName = parseExtensions(node);
		}
		idx++;
	}

	return {
		serialNumber,
		subject: {
			commonName: subject.CN || null,
			organization: subject.O || null,
			organizationalUnit: subject.OU || null,
			country: subject.C || null,
			state: subject.ST || null,
			locality: subject.L || null,
			raw: formatDN(subject),
		},
		issuer: {
			commonName: issuer.CN || null,
			organization: issuer.O || null,
			country: issuer.C || null,
			raw: formatDN(issuer),
		},
		validity,
		fingerprint,
		subjectAltName,
	};
}

/**
 * Parse a Name (Subject or Issuer)
 */
function parseName(nameNode: Asn1Node): Record<string, string> {
	const result: Record<string, string> = {};

	if (!nameNode.constructed || !Array.isArray(nameNode.value)) {
		return result;
	}

	const nameSeq = nameNode.value as Asn1Node[];
	for (const rdn of nameSeq) {
		if (!rdn.constructed || !Array.isArray(rdn.value)) continue;

		const rdnSeq = rdn.value as Asn1Node[];
		for (const atav of rdnSeq) {
			if (!atav.constructed || !Array.isArray(atav.value)) continue;

			const atavSeq = atav.value as Asn1Node[];
			if (atavSeq.length < 2) continue;

			const oidNode = atavSeq[0];
			const valueNode = atavSeq[1];
			if (!oidNode || !valueNode) continue;

			const oid = bytesToOid(oidNode.value as Uint8Array);
			const value = decodeString(valueNode);

			const shortName = oidToShortName(oid);
			if (shortName) {
				result[shortName] = value;
			}
		}
	}

	return result;
}

/**
 * Parse Validity - SEQUENCE { notBefore Time, notAfter Time }
 */
function parseValidity(validityNode: Asn1Node): { notBefore: Date; notAfter: Date } {
	const validitySeq = validityNode.value as Asn1Node[];
	if (!validitySeq || validitySeq.length < 2) {
		throw new Error("Invalid Validity structure");
	}

	const notBefore = validitySeq[0];
	const notAfter = validitySeq[1];
	if (!notBefore || !notAfter) {
		throw new Error("Missing validity dates");
	}

	return {
		notBefore: parseTime(notBefore),
		notAfter: parseTime(notAfter),
	};
}

/**
 * Parse Time - UTCTime or GeneralizedTime
 */
function parseTime(timeNode: Asn1Node): Date {
	const value = timeNode.value as Uint8Array;
	const timeStr = new TextDecoder().decode(value instanceof Uint8Array ? value : new Uint8Array(value));

	// UTCTime: tag 23 (0x17 hex)
	// GeneralizedTime: tag 24 (0x18 hex)
	if (timeNode.tag === 23) {
		const year = Number.parseInt(timeStr.substring(0, 2), 10);
		const fullYear = year >= 50 ? 1900 + year : 2000 + year;
		const month = Number.parseInt(timeStr.substring(2, 4), 10) - 1;
		const day = Number.parseInt(timeStr.substring(4, 6), 10);
		const hour = Number.parseInt(timeStr.substring(6, 8), 10);
		const minute = Number.parseInt(timeStr.substring(8, 10), 10);
		const second = Number.parseInt(timeStr.substring(10, 12), 10);

		return new Date(Date.UTC(fullYear, month, day, hour, minute, second));
	}

	// GeneralizedTime: YYYYMMDDhhmmssZ
	if (timeNode.tag === 24) {
		const year = Number.parseInt(timeStr.substring(0, 4), 10);
		const month = Number.parseInt(timeStr.substring(4, 6), 10) - 1;
		const day = Number.parseInt(timeStr.substring(6, 8), 10);
		const hour = Number.parseInt(timeStr.substring(8, 10), 10);
		const minute = Number.parseInt(timeStr.substring(10, 12), 10);
		const second = Number.parseInt(timeStr.substring(12, 14), 10);

		return new Date(Date.UTC(year, month, day, hour, minute, second));
	}

	throw new Error(`Unsupported time format: tag ${timeNode.tag} (hex: 0x${timeNode.tag.toString(16)})`);
}

/**
 * Parse Extensions to find SubjectAltName
 */
function parseExtensions(extensionsNode: Asn1Node): string | null {
	if (!Array.isArray(extensionsNode.value) || extensionsNode.value.length === 0) {
		return null;
	}

	const extsWrapper = extensionsNode.value as Asn1Node[];
	const extsSeq = extsWrapper[0];
	if (!extsSeq?.constructed || !Array.isArray(extsSeq.value)) return null;

	const extensions = extsSeq.value as Asn1Node[];
	for (const ext of extensions) {
		if (!ext.constructed || !Array.isArray(ext.value)) continue;

		const extSeq = ext.value as Asn1Node[];
		if (extSeq.length < 2) continue;

		const oidNode = extSeq[0];
		if (!oidNode) continue;

		const oid = bytesToOid(oidNode.value as Uint8Array);
		if (oid === OID_SUBJECT_ALT_NAME) {
			const extnValue = extSeq[extSeq.length - 1];
			if (!extnValue) continue;
			const sanDer = extnValue.value as Uint8Array;
			const sanSeq = decodeDer(sanDer);

			if (sanSeq.constructed && Array.isArray(sanSeq.value)) {
				const altNames: string[] = [];
				for (const gn of sanSeq.value as Asn1Node[]) {
					const value = decodeString(gn);
					if (value) altNames.push(value);
				}
				return altNames.join(", ");
			}
		}
	}

	return null;
}

/**
 * Decode ASN.1 string types
 */
function decodeString(node: Asn1Node): string {
	const value = node.value as Uint8Array;
	const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
	return new TextDecoder().decode(bytes);
}

/**
 * Map OID to short name
 */
function oidToShortName(oid: string): string | null {
	const map: Record<string, string> = {
		[OID_COMMON_NAME]: "CN",
		[OID_COUNTRY]: "C",
		[OID_LOCALITY]: "L",
		[OID_STATE]: "ST",
		[OID_ORGANIZATION]: "O",
		[OID_ORGANIZATIONAL_UNIT]: "OU",
	};
	return map[oid] || null;
}

/**
 * Format Distinguished Name as string
 */
function formatDN(fields: Record<string, string>): string {
	const parts: string[] = [];
	const order = ["CN", "OU", "O", "L", "ST", "C"];

	for (const key of order) {
		if (fields[key]) {
			parts.push(`${key}=${fields[key]}`);
		}
	}

	// Add any remaining fields not in order
	for (const [key, value] of Object.entries(fields)) {
		if (!order.includes(key)) {
			parts.push(`${key}=${value}`);
		}
	}

	return parts.join(", ");
}

/**
 * Convert bytes to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}
