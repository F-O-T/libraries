/**
 * useSignPdf hook tests
 *
 * Tests run with bun:test + @testing-library/react.
 * Worker is mocked to avoid real Web Worker / crypto work in unit tests.
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type {
   SignWorkerRequest,
   SignWorkerResponse,
} from "../../src/plugins/react/sign-pdf.worker.ts";

// ── Mock Worker ───────────────────────────────────────────────────────────────

/**
 * A synchronous fake Worker that intercepts postMessage calls and either
 * calls back with a success response or an error response, depending on
 * the value of `mockWorkerError`.
 */
let mockWorkerError: string | null = null;
let mockWorkerResult: Uint8Array = new Uint8Array([1, 2, 3, 4]);
let lastWorkerRequest: SignWorkerRequest | null = null;
let workerPostMessageCallCount = 0;
let capturedMessageHandler: ((ev: MessageEvent) => void) | null = null;

class MockWorker {
   private _messageListeners: Array<(ev: MessageEvent) => void> = [];

   addEventListener(type: string, handler: (ev: MessageEvent) => void) {
      if (type === "message") {
         this._messageListeners.push(handler);
         capturedMessageHandler = handler;
      }
   }

   removeEventListener(type: string, handler: (ev: MessageEvent) => void) {
      if (type === "message") {
         this._messageListeners = this._messageListeners.filter(
            (h) => h !== handler,
         );
      }
   }

   postMessage(data: SignWorkerRequest) {
      workerPostMessageCallCount++;
      lastWorkerRequest = data;

      // Simulate async worker response
      Promise.resolve().then(() => {
         let response: SignWorkerResponse;
         if (mockWorkerError !== null) {
            response = { id: data.id, ok: false, message: mockWorkerError };
         } else {
            const buf = mockWorkerResult.buffer.slice(
               mockWorkerResult.byteOffset,
               mockWorkerResult.byteOffset + mockWorkerResult.byteLength,
            ) as ArrayBuffer;
            response = { id: data.id, ok: true, signedBuffer: buf };
         }
         const ev = { data: response } as MessageEvent<SignWorkerResponse>;
         for (const listener of this._messageListeners) {
            listener(ev);
         }
      });
   }

   terminate() {}
}

// Replace global Worker with our mock
(globalThis as unknown as { Worker: unknown }).Worker = MockWorker;

// Import AFTER setting up mock Worker
import { useSignPdf } from "../../src/plugins/react/index.ts";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeP12(): Uint8Array {
   return new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
}
function makePdf(): Uint8Array {
   return new Uint8Array([0x25, 0x50, 0x44, 0x46]);
} // %PDF

// ── Tests ────────────────────────────────────────────────────────────────────

describe("useSignPdf", () => {
   beforeEach(() => {
      mockWorkerError = null;
      mockWorkerResult = new Uint8Array([1, 2, 3, 4]);
      lastWorkerRequest = null;
      workerPostMessageCallCount = 0;
      capturedMessageHandler = null;
   });

   // ── Initial state ──────────────────────────────────────────────────────────

   it("starts in idle state", () => {
      const { result } = renderHook(() => useSignPdf());

      expect(result.current.status).toBe("idle");
      expect(result.current.isIdle).toBe(true);
      expect(result.current.isSigning).toBe(false);
      expect(result.current.isDone).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
   });

   // ── Happy path ─────────────────────────────────────────────────────────────

   it("transitions idle → signing → done on success", async () => {
      const { result } = renderHook(() => useSignPdf());

      let signedResult: Uint8Array | undefined;

      await act(async () => {
         signedResult = await result.current.sign({
            pdf: makePdf(),
            p12: makeP12(),
            password: "test123",
         });
      });

      expect(result.current.status).toBe("done");
      expect(result.current.isDone).toBe(true);
      expect(result.current.result).toBeInstanceOf(Uint8Array);
      expect(result.current.result).toEqual(new Uint8Array([1, 2, 3, 4]));
      expect(signedResult).toEqual(new Uint8Array([1, 2, 3, 4]));
      expect(workerPostMessageCallCount).toBe(1);
   });

   it("passes pdf and p12 as ArrayBuffer to worker", async () => {
      const { result } = renderHook(() => useSignPdf());
      const pdf = makePdf();
      const p12 = makeP12();

      await act(async () => {
         await result.current.sign({ pdf, p12, password: "pw" });
      });

      expect(lastWorkerRequest).not.toBeNull();
      expect(new Uint8Array(lastWorkerRequest!.pdfBuffer)).toEqual(pdf);
      expect(new Uint8Array(lastWorkerRequest!.p12Buffer)).toEqual(p12);
      expect(lastWorkerRequest!.password).toBe("pw");
   });

   it("converts File input to ArrayBuffer before sending to worker", async () => {
      const pdfBytes = makePdf();
      const pdfFile = new File([pdfBytes.buffer as ArrayBuffer], "doc.pdf", {
         type: "application/pdf",
      });
      const p12Bytes = makeP12();
      const p12File = new File([p12Bytes.buffer as ArrayBuffer], "cert.p12");

      const { result } = renderHook(() => useSignPdf());

      await act(async () => {
         await result.current.sign({
            pdf: pdfFile,
            p12: p12File,
            password: "pw",
         });
      });

      expect(lastWorkerRequest).not.toBeNull();
      expect(new Uint8Array(lastWorkerRequest!.pdfBuffer)).toEqual(pdfBytes);
      expect(new Uint8Array(lastWorkerRequest!.p12Buffer)).toEqual(p12Bytes);
   });

   it("converts Blob input to ArrayBuffer before sending to worker", async () => {
      const pdfBytes = makePdf();
      const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], {
         type: "application/pdf",
      });

      const { result } = renderHook(() => useSignPdf());

      await act(async () => {
         await result.current.sign({
            pdf: pdfBlob,
            p12: makeP12(),
            password: "pw",
         });
      });

      expect(lastWorkerRequest).not.toBeNull();
      expect(new Uint8Array(lastWorkerRequest!.pdfBuffer)).toEqual(pdfBytes);
   });

   it("forwards extra PdfSignOptions to worker", async () => {
      const { result } = renderHook(() => useSignPdf());

      await act(async () => {
         await result.current.sign({
            pdf: makePdf(),
            p12: makeP12(),
            password: "pw",
            options: {
               reason: "Approval",
               location: "São Paulo",
               policy: "pades-icp-brasil",
            },
         });
      });

      expect(lastWorkerRequest?.options?.reason).toBe("Approval");
      expect(lastWorkerRequest?.options?.location).toBe("São Paulo");
      expect(lastWorkerRequest?.options?.policy).toBe("pades-icp-brasil");
   });

   // ── Error path ─────────────────────────────────────────────────────────────

   it("transitions idle → signing → error on failure", async () => {
      mockWorkerError = "Bad certificate";

      const { result } = renderHook(() => useSignPdf());

      await act(async () => {
         await result.current
            .sign({ pdf: makePdf(), p12: makeP12(), password: "bad" })
            .catch(() => {
               /* expected */
            });
      });

      expect(result.current.status).toBe("error");
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toBe("Bad certificate");
      expect(result.current.result).toBeNull();
   });

   it("re-throws the error so callers can handle it", async () => {
      mockWorkerError = "Boom";

      const { result } = renderHook(() => useSignPdf());

      let thrown: Error | null = null;
      await act(async () => {
         try {
            await result.current.sign({
               pdf: makePdf(),
               p12: makeP12(),
               password: "pw",
            });
         } catch (e) {
            thrown = e as Error;
         }
      });

      expect((thrown as Error | null)?.message).toBe("Boom");
   });

   it("wraps non-Error worker messages in a plain Error", async () => {
      // Worker always sends a string message for errors; the hook wraps in Error
      mockWorkerError = "Unknown signing error";

      const { result } = renderHook(() => useSignPdf());

      await act(async () => {
         await result.current
            .sign({ pdf: makePdf(), p12: makeP12(), password: "pw" })
            .catch(() => {});
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Unknown signing error");
   });

   // ── reset ──────────────────────────────────────────────────────────────────

   it("reset() returns to idle state after done", async () => {
      const { result } = renderHook(() => useSignPdf());

      await act(async () => {
         await result.current.sign({
            pdf: makePdf(),
            p12: makeP12(),
            password: "pw",
         });
      });
      expect(result.current.isDone).toBe(true);

      act(() => {
         result.current.reset();
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.result).toBeNull();
   });

   it("reset() returns to idle state after error", async () => {
      mockWorkerError = "fail";

      const { result } = renderHook(() => useSignPdf());

      await act(async () => {
         await result.current
            .sign({ pdf: makePdf(), p12: makeP12(), password: "pw" })
            .catch(() => {});
      });
      expect(result.current.isError).toBe(true);

      act(() => {
         result.current.reset();
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.error).toBeNull();
   });

   // ── Concurrent call guard ──────────────────────────────────────────────────

   it("ignores a second sign() call while already signing", async () => {
      // Create a manually-controlled worker by intercepting postMessage
      let resolveWorker!: (result: Uint8Array) => void;
      const workerResultPromise = new Promise<Uint8Array>((res) => {
         resolveWorker = res;
      });

      // Override MockWorker to hold the response until manually resolved
      let pendingRequest: SignWorkerRequest | null = null;
      let pendingListeners: Array<(ev: MessageEvent) => void> = [];
      const ControlledWorker = class {
         addEventListener(type: string, handler: (ev: MessageEvent) => void) {
            if (type === "message") pendingListeners.push(handler);
         }
         removeEventListener(
            _type: string,
            handler: (ev: MessageEvent) => void,
         ) {
            pendingListeners = pendingListeners.filter((h) => h !== handler);
         }
         postMessage(data: SignWorkerRequest) {
            workerPostMessageCallCount++;
            pendingRequest = data;
            // Do NOT respond immediately — wait for workerResultPromise
            workerResultPromise.then((bytes) => {
               const buf = bytes.buffer.slice(
                  bytes.byteOffset,
                  bytes.byteOffset + bytes.byteLength,
               ) as ArrayBuffer;
               const response: SignWorkerResponse = {
                  id: data.id,
                  ok: true,
                  signedBuffer: buf,
               };
               const ev = {
                  data: response,
               } as MessageEvent<SignWorkerResponse>;
               for (const l of pendingListeners) l(ev);
            });
         }
         terminate() {}
      };

      (globalThis as unknown as { Worker: unknown }).Worker = ControlledWorker;

      const { result } = renderHook(() => useSignPdf());

      // Start first sign — do not await yet
      let firstResult: Promise<Uint8Array | undefined> | undefined;
      act(() => {
         firstResult = result.current.sign({
            pdf: makePdf(),
            p12: makeP12(),
            password: "pw",
         });
      });

      // Attempt second sign while first is in progress
      let secondResult: Uint8Array | undefined;
      await act(async () => {
         secondResult = await result.current.sign({
            pdf: makePdf(),
            p12: makeP12(),
            password: "pw",
         });
      });

      // Second call should be a no-op (returns undefined, no additional postMessage)
      expect(secondResult).toBeUndefined();
      expect(workerPostMessageCallCount).toBe(1);
      expect(pendingRequest).not.toBeNull();

      // Resolve the first sign
      resolveWorker(new Uint8Array([9, 9]));
      await act(async () => {
         await firstResult;
      });
      expect(result.current.isDone).toBe(true);

      // Restore MockWorker for other tests
      (globalThis as unknown as { Worker: unknown }).Worker = MockWorker;
   });

   // ── download helper ────────────────────────────────────────────────────────

   it("download() creates and clicks an <a> element with a blob URL", async () => {
      const { result } = renderHook(() => useSignPdf());

      await act(async () => {
         await result.current.sign({
            pdf: makePdf(),
            p12: makeP12(),
            password: "pw",
         });
      });

      // Mock URL.createObjectURL / revokeObjectURL
      const mockUrl = "blob:http://localhost/fake-uuid";
      const originalCreate = URL.createObjectURL;
      const originalRevoke = URL.revokeObjectURL;
      const originalAppend = document.body.appendChild.bind(document.body);
      const originalRemove = document.body.removeChild.bind(document.body);
      const clickMock = mock(() => {});

      URL.createObjectURL = mock(() => mockUrl);
      URL.revokeObjectURL = mock(() => {});

      const appendMock = mock((el: HTMLElement) => {
         el.click = clickMock;
      });
      document.body.appendChild =
         appendMock as unknown as typeof document.body.appendChild;
      document.body.removeChild = mock(
         () => document.body,
      ) as unknown as typeof document.body.removeChild;

      act(() => {
         result.current.download("output.pdf");
      });

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickMock).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);

      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
      document.body.appendChild = originalAppend;
      document.body.removeChild = originalRemove;
   });

   it("download() is a no-op when status is not done", () => {
      const { result } = renderHook(() => useSignPdf());

      const originalAppend = document.body.appendChild.bind(document.body);
      const appendMock = mock(() => {});
      document.body.appendChild =
         appendMock as unknown as typeof document.body.appendChild;

      act(() => {
         result.current.download("output.pdf");
      });

      document.body.appendChild = originalAppend;
      expect(appendMock).not.toHaveBeenCalled();
   });
});
