import type { PdfSignOptions } from "../../types.ts";

export type WorkerRequest = {
   id: number;
   pdf: Uint8Array;
   options: PdfSignOptions;
};

export type WorkerResponse =
   | { id: number; ok: true; result: Uint8Array }
   | { id: number; ok: false; error: string };

/**
 * Sign a PDF in a Web Worker to avoid blocking the main thread.
 *
 * The consumer must create a worker file in their project that imports
 * `signPdf` from `@f-o-t/e-signature` — this lets the bundler resolve
 * all dependencies correctly inside the worker context.
 *
 * @param worker - A Worker that handles signing messages
 * @param pdf - PDF bytes
 * @param options - Same options as signPdf()
 * @returns Signed PDF bytes
 *
 * @example
 * ```ts
 * // 1. Create workers/sign-pdf.ts in your project:
 * //    import { signPdf } from "@f-o-t/e-signature";
 * //    self.onmessage = async (e) => {
 * //      const { id, pdf, options } = e.data;
 * //      try {
 * //        const result = await signPdf(pdf, options);
 * //        self.postMessage({ id, ok: true, result }, [result.buffer]);
 * //      } catch (err) {
 * //        self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
 * //      }
 * //    };
 * //
 * // 2. Use in your component:
 * const worker = new Worker(new URL("./workers/sign-pdf", import.meta.url), { type: "module" });
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
      worker.postMessage(
         { id, pdf, options } satisfies WorkerRequest,
         { transfer },
      );
   });
}

let nextId = 1;
