/**
 * RFC 3161 Timestamp Client for ICP-Brasil
 *
 * Connects to timestamp servers to get trusted timestamps for signatures
 */

import axios from "axios";
import { createHash } from "node:crypto";
import forge from "node-forge";

/**
 * ICP-Brasil Approved Timestamp Servers
 *
 * These are free timestamp servers that can be used for testing.
 * For production, use commercial ICP-Brasil TSA services.
 */
export const TIMESTAMP_SERVERS = {
  // Valid.com TSA (free for testing)
  VALID: "http://timestamp.valid.com.br/tsa",

  // Safeweb TSA
  SAFEWEB: "http://tsa.safeweb.com.br/tsa/tsa",

  // Certisign TSA
  CERTISIGN: "http://timestamp.certisign.com.br",
};

export interface TimestampOptions {
  /** URL of the timestamp server */
  tsaUrl?: string;

  /** Hash algorithm to use (default: SHA-256) */
  hashAlgorithm?: "sha256" | "sha384" | "sha512";
}

/**
 * Request a timestamp from a TSA server
 *
 * @param dataToTimestamp - The data to timestamp (usually the signature)
 * @param options - Timestamp options
 * @returns Timestamp token (ASN.1 encoded)
 */
export async function requestTimestamp(
  dataToTimestamp: Buffer,
  options: TimestampOptions = {}
): Promise<Buffer> {
  const {
    tsaUrl = TIMESTAMP_SERVERS.VALID,
    hashAlgorithm = "sha256",
  } = options;

  try {
    // 1. Calculate hash of data to timestamp
    const hash = createHash(hashAlgorithm).update(dataToTimestamp).digest();

    // 2. Create TimeStampReq (RFC 3161)
    const timestampReq = createTimestampRequest(hash, hashAlgorithm);

    // 3. Send request to TSA
    const response = await axios.post(tsaUrl, timestampReq, {
      headers: {
        "Content-Type": "application/timestamp-query",
      },
      responseType: "arraybuffer",
      timeout: 10000, // 10 second timeout
    });

    // 4. Parse response
    if (response.status !== 200) {
      throw new Error(`TSA returned status ${response.status}`);
    }

    const timestampResp = Buffer.from(response.data);

    // 5. Validate response
    validateTimestampResponse(timestampResp);

    return timestampResp;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Timestamp request failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create a TimeStampReq according to RFC 3161
 */
function createTimestampRequest(messageHash: Buffer, hashAlgorithm: string): Buffer {
  // Get hash algorithm OID
  const hashOid = getHashAlgorithmOid(hashAlgorithm);

  // Create TimeStampReq ASN.1 structure
  const timestampReq = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      // version INTEGER (v1 = 1)
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.INTEGER,
        false,
        forge.asn1.integerToDer(1).getBytes()
      ),
      // messageImprint MessageImprint
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        [
          // hashAlgorithm AlgorithmIdentifier
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.SEQUENCE,
            true,
            [
              forge.asn1.create(
                forge.asn1.Class.UNIVERSAL,
                forge.asn1.Type.OID,
                false,
                forge.asn1.oidToDer(hashOid).getBytes()
              ),
            ]
          ),
          // hashedMessage OCTET STRING
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.OCTETSTRING,
            false,
            messageHash.toString("binary")
          ),
        ]
      ),
      // certReq BOOLEAN DEFAULT FALSE
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.BOOLEAN,
        false,
        "\xff" // TRUE - request certificate in response
      ),
    ]
  );

  return Buffer.from(forge.asn1.toDer(timestampReq).getBytes(), "binary");
}

/**
 * Validate timestamp response
 */
function validateTimestampResponse(response: Buffer): void {
  try {
    // Parse TimeStampResp
    const asn1 = forge.asn1.fromDer(response.toString("binary"));

    // Check status
    // TimeStampResp ::= SEQUENCE {
    //   status PKIStatusInfo,
    //   timeStampToken TimeStampToken OPTIONAL
    // }
    const status = asn1.value[0] as forge.asn1.Asn1;
    const statusValue = status.value[0] as forge.asn1.Asn1;
    const statusInt = forge.asn1.derToInteger(statusValue.value.toString());

    if (statusInt !== 0) {
      throw new Error(`Timestamp request failed with status: ${statusInt}`);
    }

    // Verify we have a timestamp token
    if (!asn1.value[1]) {
      throw new Error("Timestamp response does not contain a token");
    }
  } catch (error) {
    throw new Error(`Invalid timestamp response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get OID for hash algorithm
 */
function getHashAlgorithmOid(algorithm: string): string {
  const oids: Record<string, string> = {
    sha256: "2.16.840.1.101.3.4.2.1",
    sha384: "2.16.840.1.101.3.4.2.2",
    sha512: "2.16.840.1.101.3.4.2.3",
  };

  const oid = oids[algorithm];
  if (!oid) {
    throw new Error(`Unsupported hash algorithm: ${algorithm}`);
  }

  return oid;
}

/**
 * Extract timestamp token from response for embedding in signature
 */
export function extractTimestampToken(timestampResponse: Buffer): Buffer {
  try {
    const asn1 = forge.asn1.fromDer(timestampResponse.toString("binary"));

    // TimeStampToken is the second element (index 1) of TimeStampResp
    const timestampToken = asn1.value[1] as forge.asn1.Asn1;

    return Buffer.from(forge.asn1.toDer(timestampToken).getBytes(), "binary");
  } catch (error) {
    throw new Error(`Failed to extract timestamp token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
