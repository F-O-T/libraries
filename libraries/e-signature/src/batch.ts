import { signPdf } from "./sign-pdf.ts";
import type { PdfSignOptions } from "./types.ts";

/**
 * Input for a single PDF in a batch signing operation.
 */
export type BatchSignInput = {
   /** Filename for identification in events */
   filename: string;
   /** PDF content as Uint8Array or ReadableStream */
   pdf: Uint8Array | ReadableStream<Uint8Array>;
   /** Per-file option overrides merged with base options */
   options?: Partial<PdfSignOptions>;
};

/**
 * Events emitted during batch signing.
 */
export type BatchSignEvent =
   | { type: "file_start"; fileIndex: number; filename: string }
   | {
        type: "file_complete";
        fileIndex: number;
        filename: string;
        signed: Uint8Array;
     }
   | { type: "file_error"; fileIndex: number; filename: string; error: string }
   | { type: "batch_complete"; totalFiles: number; errorCount: number };

/**
 * Sign multiple PDFs sequentially, yielding progress events.
 *
 * Yields control between each signing operation to prevent blocking
 * the event loop under bulk load.
 *
 * @param files - Array of PDFs with filename and optional per-file options
 * @param options - Base signing options (per-file options override these)
 * @yields BatchSignEvent for each file start, completion, error, and batch complete
 */
export async function* signPdfBatch(
   files: BatchSignInput[],
   options: PdfSignOptions,
): AsyncGenerator<BatchSignEvent> {
   let errorCount = 0;
   let processedCount = 0;

   for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      processedCount++;

      yield { type: "file_start", fileIndex: i, filename: file.filename };

      try {
         // Merge per-file options with base options (file.options takes priority)
         const mergedOptions: PdfSignOptions = { ...options, ...file.options };

         const signed = await signPdf(file.pdf, mergedOptions);

         yield {
            type: "file_complete",
            fileIndex: i,
            filename: file.filename,
            signed,
         };
      } catch (err) {
         errorCount++;
         yield {
            type: "file_error",
            fileIndex: i,
            filename: file.filename,
            error: err instanceof Error ? err.message : String(err),
         };
      }

      // Yield control between files to prevent event loop blocking
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
   }

   yield { type: "batch_complete", totalFiles: processedCount, errorCount };
}

/**
 * Sign multiple PDFs sequentially, collecting all results.
 *
 * Convenience wrapper around {@link signPdfBatch} that collects all events
 * into an array of results.
 *
 * @param files - Array of PDFs with filename and optional per-file options
 * @param options - Base signing options
 * @returns Array of results with signed PDF bytes or error per file
 */
export async function signPdfBatchToArray(
   files: BatchSignInput[],
   options: PdfSignOptions,
): Promise<{ filename: string; signed?: Uint8Array; error?: string }[]> {
   const results: { filename: string; signed?: Uint8Array; error?: string }[] =
      files.map((f) => ({ filename: f.filename }));

   for await (const event of signPdfBatch(files, options)) {
      switch (event.type) {
         case "file_complete": {
            const r = results[event.fileIndex];
            if (r) r.signed = event.signed;
            break;
         }
         case "file_error": {
            const r = results[event.fileIndex];
            if (r) r.error = event.error;
            break;
         }
      }
   }

   return results;
}
