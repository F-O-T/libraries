/**
 * Lacuna Software test certificate parse validation
 *
 * Verifies that parseCertificate (digital-certificate) and
 * parsePkcs12 (crypto / e-signature internals) can successfully
 * parse the 4 Lacuna ICP-Brasil test certificates.
 *
 * PFX password: "1234"  (documented at docs.lacunasoftware.com)
 */

import { parseCertificate } from "../src/certificate.ts";
import { parsePkcs12 } from "@f-o-t/crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FIXTURES = join(import.meta.dir, "fixtures");
const PASSWORD = "1234";

const CERTS = [
	{
		file: "lacuna-turing.pfx",
		name: "Alan Mathison Turing",
		expectCpf: "560.723.861-05",
	},
	{
		file: "lacuna-frobenius.pfx",
		name: "Ferdinand Georg Frobenius",
		expectCpf: "873.780.111-26",
	},
	{
		file: "lacuna-fermat.pfx",
		name: "Pierre de Fermat",
		expectCpf: "473.633.618-86",
	},
	{
		file: "lacuna-wayne.pfx",
		name: "Wayne Enterprises, Inc.",
		expectCnpj: true,
	},
] as const;

let passed = 0;
let failed = 0;

function ok(label: string, extra?: string) {
	console.log(`   ✓ ${label}${extra ? `  (${extra})` : ""}`);
	passed++;
}

function fail(label: string, err: unknown) {
	const msg = err instanceof Error ? err.message : String(err);
	console.error(`   ✗ ${label} — ${msg}`);
	failed++;
}

async function main() {
	console.log("Lacuna Software ICP-Brasil test certificate parse\n");

	for (const cert of CERTS) {
		console.log(`── ${cert.name}`);
		const pfx = new Uint8Array(readFileSync(join(FIXTURES, cert.file)));

		// ── 1. digital-certificate: parseCertificate ─────────────────────────
		try {
			const info = await parseCertificate(pfx, PASSWORD);
			ok("[digital-certificate] parseCertificate");
			console.log(`     CN       : ${info.subject.commonName}`);
			console.log(`     Issuer   : ${info.issuer.commonName}`);
			console.log(
				`     Valid to : ${info.validity.notAfter.toISOString().split("T")[0]}`,
			);
			const br = info.subject.brazilian;
			if (br?.cpf) {
				console.log(`     CPF      : ${br.cpf}`);
				if ("expectCpf" in cert && cert.expectCpf !== br.cpf) {
					console.warn(
						`     ⚠ Expected CPF ${cert.expectCpf}, got ${br.cpf}`,
					);
				}
			}
			if (br?.cnpj) console.log(`     CNPJ     : ${br.cnpj}`);
		} catch (err) {
			fail("[digital-certificate] parseCertificate", err);
		}

		// ── 2. crypto / e-signature internals: parsePkcs12 ───────────────────
		try {
			const { certificate, privateKey } = await parsePkcs12(pfx, PASSWORD);
			ok(
				"[crypto/e-signature]  parsePkcs12",
				`cert ${certificate.length}B, key ${privateKey.length}B`,
			);
		} catch (err) {
			fail("[crypto/e-signature]  parsePkcs12", err);
		}

		console.log();
	}

	const total = passed + failed;
	console.log(`Results: ${passed}/${total} passed`);
	if (failed > 0) process.exit(1);
}

main().catch((err) => {
	console.error("Fatal:", err);
	process.exit(1);
});
