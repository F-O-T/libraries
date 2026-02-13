import { describe, expect, it } from "bun:test";
import {
	TIMESTAMP_SERVERS,
	TIMESTAMP_TOKEN_OID,
	TimestampError,
} from "../src/timestamp.ts";

describe("timestamp module", () => {
	it("exports well-known TSA URLs", () => {
		expect(TIMESTAMP_SERVERS.VALID).toContain("timestamp.valid.com.br");
		expect(TIMESTAMP_SERVERS.SAFEWEB).toContain("safeweb.com.br");
		expect(TIMESTAMP_SERVERS.CERTISIGN).toContain("certisign.com.br");
	});

	it("exports the timestamp token OID", () => {
		expect(TIMESTAMP_TOKEN_OID).toBe("1.2.840.113549.1.9.16.2.14");
	});

	it("TimestampError has correct name", () => {
		const error = new TimestampError("test");
		expect(error.name).toBe("TimestampError");
		expect(error.message).toBe("test");
		expect(error).toBeInstanceOf(Error);
	});
});
