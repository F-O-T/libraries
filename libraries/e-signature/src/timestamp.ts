/**
 * RFC 3161 Timestamp Client
 *
 * Requests trusted timestamps from TSA servers using native fetch.
 * Builds the TimeStampReq using @f-o-t/asn1 instead of forge.
 */

import {
   type Asn1Node,
   boolean as asn1Boolean,
   decodeDer,
   encodeDer,
   integer,
   octetString,
   oid,
   sequence,
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
 * Request a timestamp from a TSA server with retry and fallback support.
 *
 * @param dataToTimestamp - The data to timestamp (usually the signature value)
 * @param tsaUrl - URL of the primary timestamp server
 * @param hashAlgorithm - Hash algorithm to use (default: "sha256")
 * @param options - Resilience options (timeout, retries, fallback URLs)
 * @returns DER-encoded TimeStampToken
 */
export async function requestTimestamp(
   dataToTimestamp: Uint8Array,
   tsaUrl: string,
   hashAlgorithm: "sha256" | "sha384" | "sha512" = "sha256",
   options?: { tsaTimeout?: number; tsaRetries?: number; tsaFallbackUrls?: string[] },
): Promise<Uint8Array> {
   // 1. Hash the data
   const messageHash = hash(hashAlgorithm, dataToTimestamp);

   // 2. Build TimeStampReq
   const timestampReq = buildTimestampRequest(messageHash, hashAlgorithm);

   const tsaTimeout = options?.tsaTimeout ?? 10000;
   const tsaRetries = options?.tsaRetries ?? 1;
   const tsaFallbackUrls = options?.tsaFallbackUrls ?? [];

   let lastError: Error | undefined;

   // 3. Try primary server (tsaRetries total attempts)
   for (let attempt = 1; attempt <= tsaRetries; attempt++) {
      if (attempt > 1) {
         await sleep((attempt - 1) * 1000);
      }
      try {
         return await fetchTimestamp(tsaUrl, timestampReq, tsaTimeout);
      } catch (err) {
         lastError = err instanceof Error ? err : new Error(String(err));
      }
   }

   // 4. Try fallback servers (one attempt each, no delay)
   for (const fallbackUrl of tsaFallbackUrls) {
      try {
         return await fetchTimestamp(fallbackUrl, timestampReq, tsaTimeout);
      } catch (err) {
         lastError = err instanceof Error ? err : new Error(String(err));
      }
   }

   // 5. All servers failed
   const fallbackList = tsaFallbackUrls.length > 0
      ? `, fallbacks: [${tsaFallbackUrls.join(", ")}]`
      : "";
   throw new TimestampError(
      `TSA request failed: all servers unreachable (primary: ${tsaUrl}${fallbackList}). Last error: ${lastError?.message ?? "unknown"}`,
   );
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
   return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Perform a single TSA fetch attempt, wrapping network errors with a descriptive message.
 */
async function fetchTimestamp(
   url: string,
   timestampReq: Uint8Array,
   timeoutMs: number,
): Promise<Uint8Array> {
   let response: Response;
   try {
      response = await fetch(url, {
         method: "POST",
         headers: {
            "Content-Type": "application/timestamp-query",
         },
         body: timestampReq as unknown as BodyInit,
         signal: AbortSignal.timeout(timeoutMs),
      });
   } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`TSA server unreachable: ${url} — ${msg}`);
   }

   if (!response.ok) {
      throw new TimestampError(`TSA returned HTTP ${response.status}`);
   }

   const respBuffer = new Uint8Array(await response.arrayBuffer());
   return extractTimestampToken(respBuffer);
}

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
      throw new TimestampError("Timestamp response does not contain a token");
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
