import type { PdfSignOptions } from "../../types.ts";
import type { WorkerRequest, WorkerResponse } from "../worker-entry/index.ts";

/**
 * Sign a PDF in a Web Worker to avoid blocking the main thread.
 *
 * @param worker - A Worker running the worker-entry plugin script
 * @param pdf - PDF bytes
 * @param options - Same options as signPdf()
 * @returns Signed PDF bytes
 *
 * @example
 * ```ts
 * const worker = new Worker(
 *   new URL("@f-o-t/e-signature/plugins/worker-entry", import.meta.url),
 *   { type: "module" },
 * );
 * const signed = await signPdfInWorker(worker, pdfBytes, options);
 * worker.terminate();
 * ```
 */
export function signPdfInWorker(
	worker: Worker,
	pdf: Uint8Array,
	options: PdfSignOptions,
): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		const id = nextId++;

		function onMessage(e: MessageEvent<WorkerResponse>) {
			if (e.data.id !== id) return;
			worker.removeEventListener("message", onMessage);
			worker.removeEventListener("error", onError);

			if (e.data.ok) {
				resolve(e.data.result);
			} else {
				reject(new Error(e.data.error));
			}
		}

		function onError(e: ErrorEvent) {
			worker.removeEventListener("message", onMessage);
			worker.removeEventListener("error", onError);
			reject(new Error(e.message || "Worker error"));
		}

		worker.addEventListener("message", onMessage);
		worker.addEventListener("error", onError);

		const transfer = pdf.buffer instanceof ArrayBuffer ? [pdf.buffer] : [];
		worker.postMessage({ id, pdf, options } satisfies WorkerRequest, { transfer });
	});
}

let nextId = 1;

export type { WorkerRequest, WorkerResponse } from "../worker-entry/index.ts";
