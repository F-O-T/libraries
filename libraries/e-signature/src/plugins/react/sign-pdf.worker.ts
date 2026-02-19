/**
 * Web Worker for offloading PDF signing off the main thread.
 *
 * The main thread sends a SignWorkerRequest, the worker replies with a
 * SignWorkerResponse. ArrayBuffers are transferred (zero-copy) in both
 * directions.
 */

import { signPdf } from "../../sign-pdf.ts";
import type { PdfSignOptions } from "../../types.ts";

export type SignWorkerRequest = {
   id: string;
   pdfBuffer: ArrayBuffer;
   p12Buffer: ArrayBuffer;
   password: string;
   options?: Omit<PdfSignOptions, "certificate">;
};

export type SignWorkerResponse =
   | { id: string; ok: true; signedBuffer: ArrayBuffer }
   | { id: string; ok: false; message: string };

self.onmessage = async (ev: MessageEvent<SignWorkerRequest>) => {
   const { id, pdfBuffer, p12Buffer, password, options } = ev.data;

   try {
      const signed = await signPdf(new Uint8Array(pdfBuffer), {
         ...options,
         certificate: {
            p12: new Uint8Array(p12Buffer),
            password,
         },
      });

      // Transfer the underlying ArrayBuffer — zero-copy hand-off to main thread
      const signedBuffer = signed.buffer.slice(
         signed.byteOffset,
         signed.byteOffset + signed.byteLength,
      ) as ArrayBuffer;

      const response: SignWorkerResponse = { id, ok: true, signedBuffer };
      (self as unknown as Worker).postMessage(response, [signedBuffer]);
   } catch (err) {
      const message =
         err instanceof Error ? err.message : "Unknown signing error";
      const response: SignWorkerResponse = { id, ok: false, message };
      (self as unknown as Worker).postMessage(response);
   }
};
