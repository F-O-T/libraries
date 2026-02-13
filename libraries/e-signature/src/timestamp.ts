/**
 * RFC 3161 Timestamp Client
 *
 * Requests trusted timestamps from TSA servers using native fetch.
 * Builds the TimeStampReq using @f-o-t/asn1 instead of forge.
 */

import {
	encodeDer,
	decodeDer,
	sequence,
	integer,
	oid,
	octetString,
	boolean as asn1Boolean,
	type Asn1Node,
} from "@f-o-t/asn1";
import { hash } from "@f-o-t/crypto";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Well-known hash algorithm OIDs */
const HASH_OIDS: Record<string, string> = {
	sha256: "2.16.840.1.101.3.4.2.1",
	sha384: "2.16.840.1.101.3.4.2.2",
	sha512: "2.16.840.1.101.3.4.2.3",
};

/** ICP-Brasil Approved Timestamp Servers */
export const TIMESTAMP_SERVERS = {
	VALID: "http://timestamp.valid.com.br/tsa",
	SAFEWEB: "http://tsa.safeweb.com.br/tsa/tsa",
	CERTISIGN: "http://timestamp.certisign.com.br",
} as const;

/** id-smime-aa-timeStampToken OID */
export const TIMESTAMP_TOKEN_OID = "1.2.840.113549.1.9.16.2.14";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Request a timestamp from a TSA server.
 *
 * @param dataToTimestamp - The data to timestamp (usually the signature value)
 * @param tsaUrl - URL of the timestamp server
 * @param hashAlgorithm - Hash algorithm to use (default: "sha256")
 * @returns DER-encoded TimeStampToken
 */
export async function requestTimestamp(
	dataToTimestamp: Uint8Array,
	tsaUrl: string,
	hashAlgorithm: "sha256" | "sha384" | "sha512" = "sha256",
): Promise<Uint8Array> {
	// 1. Hash the data
	const messageHash = hash(hashAlgorithm, dataToTimestamp);

	// 2. Build TimeStampReq
	const timestampReq = buildTimestampRequest(messageHash, hashAlgorithm);

	// 3. Send to TSA
	const response = await fetch(tsaUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/timestamp-query",
		},
		body: timestampReq as unknown as BodyInit,
		signal: AbortSignal.timeout(10000),
	});

	if (!response.ok) {
		throw new TimestampError(`TSA returned HTTP ${response.status}`);
	}

	const respBuffer = new Uint8Array(await response.arrayBuffer());

	// 4. Validate and extract token
	return extractTimestampToken(respBuffer);
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/**
 * Build a TimeStampReq (RFC 3161) as DER bytes.
 *
 * TimeStampReq ::= SEQUENCE {
 *   version INTEGER { v1(1) },
 *   messageImprint MessageImprint,
 *   certReq BOOLEAN DEFAULT FALSE
 * }
 *
 * MessageImprint ::= SEQUENCE {
 *   hashAlgorithm AlgorithmIdentifier,
 *   hashedMessage OCTET STRING
 * }
 */
function buildTimestampRequest(
	messageHash: Uint8Array,
	hashAlgorithm: string,
): Uint8Array {
	const hashOid = HASH_OIDS[hashAlgorithm];
	if (!hashOid) {
		throw new TimestampError(`Unsupported hash algorithm: ${hashAlgorithm}`);
	}

	const timestampReq = sequence(
		// version = 1
		integer(1),
		// messageImprint
		sequence(
			// hashAlgorithm AlgorithmIdentifier
			sequence(oid(hashOid)),
			// hashedMessage OCTET STRING
			octetString(messageHash),
		),
		// certReq = TRUE (request certificate in response)
		asn1Boolean(true),
	);

	return encodeDer(timestampReq);
}

/**
 * Extract the TimeStampToken from a TimeStampResp.
 *
 * TimeStampResp ::= SEQUENCE {
 *   status PKIStatusInfo,
 *   timeStampToken TimeStampToken OPTIONAL
 * }
 *
 * PKIStatusInfo ::= SEQUENCE {
 *   status PKIStatus, -- INTEGER
 *   ...
 * }
 */
function extractTimestampToken(respDer: Uint8Array): Uint8Array {
	let resp: Asn1Node;
	try {
		resp = decodeDer(respDer);
	} catch {
		throw new TimestampError("Invalid timestamp response: not valid DER");
	}

	const children = resp.value as Asn1Node[];
	if (!Array.isArray(children) || children.length < 1) {
		throw new TimestampError(
			"Invalid timestamp response: unexpected structure",
		);
	}

	// Check status
	const statusInfo = children[0]!.value as Asn1Node[];
	const statusBytes = statusInfo[0]!.value as Uint8Array;
	// Status 0 = granted, 1 = grantedWithMods
	const statusValue = statusBytes[statusBytes.length - 1]!;
	if (statusValue !== 0 && statusValue !== 1) {
		throw new TimestampError(
			`Timestamp request rejected with status: ${statusValue}`,
		);
	}

	// Extract token (second child)
	if (!children[1]) {
		throw new TimestampError(
			"Timestamp response does not contain a token",
		);
	}

	return encodeDer(children[1]);
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class TimestampError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TimestampError";
	}
}
