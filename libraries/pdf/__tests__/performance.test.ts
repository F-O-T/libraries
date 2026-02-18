import { expect, setDefaultTimeout, test } from "bun:test";

setDefaultTimeout(120000);

import { loadPdf } from "../src/plugins/editing/index.ts";
import { PDFDocument } from "../src/plugins/generation/document.ts";

interface BenchmarkResult {
	name: string;
	iterations: number;
	totalMs: number;
	avgMs: number;
	minMs: number;
	maxMs: number;
	opsPerSec: number;
}

function benchmark(
	name: string,
	fn: () => void,
	iterations = 100,
): BenchmarkResult {
	const times: number[] = [];

	// Warmup
	for (let i = 0; i < 5; i++) {
		fn();
	}

	for (let i = 0; i < iterations; i++) {
		const start = performance.now();
		fn();
		const end = performance.now();
		times.push(end - start);
	}

	const totalMs = times.reduce((a, b) => a + b, 0);
	const avgMs = totalMs / iterations;
	const minMs = Math.min(...times);
	const maxMs = Math.max(...times);
	const opsPerSec = 1000 / avgMs;

	return { avgMs, iterations, maxMs, minMs, name, opsPerSec, totalMs };
}

function formatResult(result: BenchmarkResult): string {
	return `${result.name}: avg=${result.avgMs.toFixed(3)}ms, min=${result.minMs.toFixed(3)}ms, max=${result.maxMs.toFixed(3)}ms, ops/s=${result.opsPerSec.toFixed(2)}`;
}

function createMultiPagePdf(pageCount: number): Uint8Array {
	const doc = new PDFDocument();
	for (let i = 0; i < pageCount; i++) {
		const page = doc.addPage({ size: "Letter" });
		page.drawText(`Page ${i + 1}`, { x: 50, y: 700, size: 16 });
	}
	return doc.save();
}

test("performance: load + saveWithPlaceholder (1 page, 50 iterations)", () => {
	const pdf = createMultiPagePdf(1);

	const result = benchmark(
		"load-save-placeholder-1page",
		() => {
			const doc = loadPdf(pdf);
			doc.saveWithPlaceholder({
				reason: "Performance test",
				name: "Test Signer",
				signatureLength: 16384,
				docMdpPermission: 2,
			});
		},
		50,
	);

	console.log(formatResult(result));
	expect(result.avgMs).toBeLessThan(100);
});

test("performance: scale test — 1, 5, and 10 pages", () => {
	const configs = [
		{ pages: 1, iterations: 20, limitMs: 100 },
		{ pages: 5, iterations: 10, limitMs: 200 },
		{ pages: 10, iterations: 5, limitMs: 400 },
	];

	for (const { pages, iterations, limitMs } of configs) {
		const pdf = createMultiPagePdf(pages);

		const result = benchmark(
			`load-save-placeholder-${pages}pages`,
			() => {
				const doc = loadPdf(pdf);
				doc.saveWithPlaceholder({
					reason: "Performance test",
					name: "Test Signer",
					signatureLength: 16384,
					docMdpPermission: 2,
				});
			},
			iterations,
		);

		console.log(formatResult(result));
		expect(result.avgMs).toBeLessThan(limitMs);
	}
});
