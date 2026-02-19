/**
 * React hook for client-side PDF signing
 *
 * @example
 * ```tsx
 * import { useSignPdf } from "@f-o-t/e-signature/plugins/react";
 *
 * function SignForm() {
 *   const { sign, isSigning, isDone, result, error, download, reset } = useSignPdf();
 *   // ...
 * }
 * ```
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { PdfSignOptions } from "../../types.ts";
import type {
   SignWorkerRequest,
   SignWorkerResponse,
} from "./sign-pdf.worker.ts";

// ── Public types ──────────────────────────────────────────────────────────────

/** Anything that can be resolved to raw PDF / P12 bytes */
export type ByteSource = File | Blob | Uint8Array;

/** Input to `sign()` */
export type SignInput = {
   /** The PDF document to sign */
   pdf: ByteSource;
   /** The .p12 / .pfx certificate */
   p12: ByteSource;
   /** Password protecting the certificate */
   password: string;
   /** All other signPdf options (reason, appearance, policy, timestamp…) */
   options?: Omit<PdfSignOptions, "certificate">;
};

/** Discriminated union for all hook states */
export type SigningStatus = "idle" | "signing" | "done" | "error";

/** Return value of useSignPdf */
export type UseSignPdfReturn = {
   /** Current lifecycle status */
   status: SigningStatus;
   /** True when no signing operation is in progress */
   isIdle: boolean;
   /** True while signing is running */
   isSigning: boolean;
   /** True when the last sign() call succeeded */
   isDone: boolean;
   /** True when the last sign() call threw */
   isError: boolean;
   /** The signed PDF bytes — non-null only when isDone */
   result: Uint8Array | null;
   /** The error from the last failure — non-null only when isError */
   error: Error | null;
   /**
    * Sign a PDF document.
    * - While a signing is already in progress, subsequent calls are ignored (returns undefined).
    * - Re-throws on failure after updating state to "error".
    * - Runs entirely in a Web Worker — the main thread stays responsive during
    *   the crypto + TSA timestamp fetch.
    */
   sign: (input: SignInput) => Promise<Uint8Array | undefined>;
   /** Trigger a browser download of the signed PDF. No-op if status is not "done". */
   download: (filename?: string) => void;
   /** Reset to idle state, clearing result and error */
   reset: () => void;
};

// ── State machine ─────────────────────────────────────────────────────────────

type State =
   | { status: "idle" }
   | { status: "signing" }
   | { status: "done"; result: Uint8Array }
   | { status: "error"; error: Error };

type Action =
   | { type: "START" }
   | { type: "SUCCESS"; result: Uint8Array }
   | { type: "FAILURE"; error: Error }
   | { type: "RESET" };

function reducer(state: State, action: Action): State {
   switch (action.type) {
      case "START":
         return { status: "signing" };
      case "SUCCESS":
         return { status: "done", result: action.result };
      case "FAILURE":
         return { status: "error", error: action.error };
      case "RESET":
         return { status: "idle" };
      default:
         return state;
   }
}

const initialState: State = { status: "idle" };

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSignPdf(): UseSignPdfReturn {
   const [state, dispatch] = useReducer(reducer, initialState);
   const workerRef = useRef<Worker | null>(null);

   // Lazily create the worker once per hook instance; terminate on unmount.
   useEffect(() => {
      const worker = new Worker(
         new URL("./sign-pdf.worker.ts", import.meta.url),
         { type: "module" },
      );
      workerRef.current = worker;
      return () => {
         worker.terminate();
         workerRef.current = null;
      };
   }, []);

   const sign = useCallback(
      async (input: SignInput): Promise<Uint8Array | undefined> => {
         if (state.status === "signing") return undefined;

         const worker = workerRef.current;
         if (!worker) throw new Error("Worker not ready");

         dispatch({ type: "START" });

         try {
            const pdfBuffer = await toArrayBuffer(input.pdf);
            const p12Buffer = await toArrayBuffer(input.p12);

            const id = Math.random().toString(36).slice(2);

            const signed = await new Promise<Uint8Array>((resolve, reject) => {
               const handler = (ev: MessageEvent<SignWorkerResponse>) => {
                  if (ev.data.id !== id) return;
                  worker.removeEventListener("message", handler);
                  if (ev.data.ok) {
                     resolve(new Uint8Array(ev.data.signedBuffer));
                  } else {
                     reject(new Error(ev.data.message));
                  }
               };
               worker.addEventListener("message", handler);

               const request: SignWorkerRequest = {
                  id,
                  pdfBuffer,
                  p12Buffer,
                  password: input.password,
                  options: input.options,
               };
               // Transfer buffers — zero-copy hand-off to worker
               worker.postMessage(request, [pdfBuffer, p12Buffer]);
            });

            dispatch({ type: "SUCCESS", result: signed });
            return signed;
         } catch (err) {
            const error =
               err instanceof Error ? err : new Error("Unknown signing error");
            dispatch({ type: "FAILURE", error });
            throw error;
         }
      },
      // sign only needs to re-create when status changes (to enforce the signing guard)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [state.status],
   );

   const download = useCallback(
      (filename = "signed.pdf") => {
         if (state.status !== "done") return;
         const blob = new Blob(
            [
               (state as { status: "done"; result: Uint8Array }).result
                  .buffer as ArrayBuffer,
            ],
            { type: "application/pdf" },
         );
         const url = URL.createObjectURL(blob);
         const a = document.createElement("a");
         a.href = url;
         a.download = filename;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
      },
      [state],
   );

   const reset = useCallback(() => dispatch({ type: "RESET" }), []);

   return {
      status: state.status,
      isIdle: state.status === "idle",
      isSigning: state.status === "signing",
      isDone: state.status === "done",
      isError: state.status === "error",
      result:
         state.status === "done"
            ? (state as { status: "done"; result: Uint8Array }).result
            : null,
      error:
         state.status === "error"
            ? (state as { status: "error"; error: Error }).error
            : null,
      sign,
      download,
      reset,
   };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function toArrayBuffer(source: ByteSource): Promise<ArrayBuffer> {
   if (source instanceof Uint8Array) {
      // Return a copy of the underlying buffer slice so we can safely transfer it
      return source.buffer.slice(
         source.byteOffset,
         source.byteOffset + source.byteLength,
      ) as ArrayBuffer;
   }
   return source.arrayBuffer();
}
