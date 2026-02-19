/**
 * useSignPdf hook tests
 *
 * Tests run with bun:test + @testing-library/react.
 * signPdf is mocked to avoid real crypto work in unit tests.
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";
import { act, renderHook } from "@testing-library/react";

// ── Mock signPdf before importing the hook ───────────────────────────────────
const mockSignPdf = mock(
   async (_pdf: Uint8Array, _opts: unknown) => new Uint8Array([1, 2, 3, 4]),
);

mock.module("../../src/sign-pdf.ts", () => ({
   signPdf: mockSignPdf,
   PdfSignError: class PdfSignError extends Error {
      constructor(msg: string) {
         super(msg);
         this.name = "PdfSignError";
      }
   },
}));

// Import AFTER mocking
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
      mockSignPdf.mockClear();
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
      expect(mockSignPdf).toHaveBeenCalledTimes(1);
   });

   it("passes pdf and p12 as Uint8Array to signPdf", async () => {
      const { result } = renderHook(() => useSignPdf());
      const pdf = makePdf();
      const p12 = makeP12();

      await act(async () => {
         await result.current.sign({ pdf, p12, password: "pw" });
      });

      const [calledPdf, calledOpts] = mockSignPdf.mock.calls[0] as [
         Uint8Array,
         { certificate: { p12: Uint8Array; password: string } },
      ];
      expect(calledPdf).toEqual(pdf);
      expect(calledOpts.certificate.p12).toEqual(p12);
      expect(calledOpts.certificate.password).toBe("pw");
   });

   it("converts File input to Uint8Array before calling signPdf", async () => {
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

      const [calledPdf, calledOpts] = mockSignPdf.mock.calls[0] as [
         Uint8Array,
         { certificate: { p12: Uint8Array } },
      ];
      expect(calledPdf).toEqual(pdfBytes);
      expect(calledOpts.certificate.p12).toEqual(p12Bytes);
   });

   it("converts Blob input to Uint8Array before calling signPdf", async () => {
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

      const [calledPdf] = mockSignPdf.mock.calls[0] as [Uint8Array, unknown];
      expect(calledPdf).toEqual(pdfBytes);
   });

   it("forwards extra PdfSignOptions to signPdf", async () => {
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

      const [, calledOpts] = mockSignPdf.mock.calls[0] as [
         unknown,
         { reason: string; location: string; policy: string },
      ];
      expect(calledOpts.reason).toBe("Approval");
      expect(calledOpts.location).toBe("São Paulo");
      expect(calledOpts.policy).toBe("pades-icp-brasil");
   });

   // ── Error path ─────────────────────────────────────────────────────────────

   it("transitions idle → signing → error on failure", async () => {
      const signingError = new Error("Bad certificate");
      mockSignPdf.mockImplementationOnce(async () => {
         throw signingError;
      });

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
      mockSignPdf.mockImplementationOnce(async () => {
         throw new Error("Boom");
      });

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

   it("wraps non-Error throws in a plain Error", async () => {
      mockSignPdf.mockImplementationOnce(async () => {
         throw "string error";
      });

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
      mockSignPdf.mockImplementationOnce(async () => {
         throw new Error("fail");
      });

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
      let resolveFirst!: (v: Uint8Array) => void;
      const firstPromise = new Promise<Uint8Array<ArrayBufferLike>>((res) => {
         resolveFirst = res;
      });
      mockSignPdf.mockImplementationOnce(
         () => firstPromise as Promise<Uint8Array<ArrayBuffer>>,
      );

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

      // Second call should be a no-op (returns undefined, no additional signPdf call)
      expect(secondResult).toBeUndefined();
      expect(mockSignPdf).toHaveBeenCalledTimes(1);

      // Resolve the first sign
      resolveFirst(new Uint8Array([9, 9]));
      await act(async () => {
         await firstResult;
      });
      expect(result.current.isDone).toBe(true);
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
