import { signPdf } from "../../sign-pdf.ts";
import type { PdfSignOptions } from "../../types.ts";

export type WorkerRequest = {
   id: number;
   pdf: Uint8Array;
   options: PdfSignOptions;
};

export type WorkerResponse =
   | { id: number; ok: true; result: Uint8Array }
   | { id: number; ok: false; error: string };

// Self-register when running as a Worker
if (
   typeof globalThis.postMessage === "function" &&
   typeof globalThis.onmessage !== "undefined"
) {
   globalThis.onmessage = async (e: MessageEvent<WorkerRequest>) => {
      const { id, pdf, options } = e.data;
      try {
         const result = await signPdf(pdf, options);
         (globalThis as unknown as Worker).postMessage(
            { id, ok: true, result } satisfies WorkerResponse,
            { transfer: [result.buffer] },
         );
      } catch (err) {
         (globalThis as unknown as Worker).postMessage({
            id,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
         } satisfies WorkerResponse);
      }
   };
}
