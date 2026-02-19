/**
 * useSignPdf hook tests
 *
 * Tests run with bun:test + @testing-library/react.
 * signPdf is mocked to avoid real crypto work in unit tests.
 */

import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { act, renderHook } from "@testing-library/react";

// ── Mock signPdf ──────────────────────────────────────────────────────────────

let mockSignError: string | null = null;
let mockSignResult: Uint8Array = new Uint8Array([1, 2, 3, 4]);
let lastSignCall: { pdf: Uint8Array; options: unknown } | null = null;

mock.module("../../src/sign-pdf.ts", () => ({
   signPdf: async (pdf: Uint8Array, options: unknown) => {
      lastSignCall = { pdf, options };
      if (mockSignError !== null) throw new Error(mockSignError);
      return mockSignResult;
   },
}));

// Import AFTER setting up mock
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
      mockSignError = null;
      mockSignResult = new Uint8Array([1, 2, 3, 4]);
      lastSignCall = null;
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
   });

   it("passes pdf and p12 as Uint8Array to signPdf", async () => {
      const { result } = renderHook(() => useSignPdf());
      const pdf = makePdf();
      const p12 = makeP12();

      await act(async () => {
         await result.current.sign({ pdf, p12, password: "pw" });
      });

      expect(lastSignCall).not.toBeNull();
      expect(lastSignCall!.pdf).toEqual(pdf);
      expect(
         (lastSignCall!.options as { certificate: { p12: Uint8Array } })
            .certificate.p12,
      ).toEqual(p12);
      expect(
         (
            lastSignCall!.options as {
               certificate: { password: string };
            }
         ).certificate.password,
      ).toBe("pw");
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

      expect(lastSignCall).not.toBeNull();
      expect(lastSignCall!.pdf).toEqual(pdfBytes);
      expect(
         (lastSignCall!.options as { certificate: { p12: Uint8Array } })
            .certificate.p12,
      ).toEqual(p12Bytes);
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

      expect(lastSignCall).not.toBeNull();
      expect(lastSignCall!.pdf).toEqual(pdfBytes);
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

      const opts = lastSignCall!.options as {
         reason: string;
         location: string;
         policy: string;
      };
      expect(opts.reason).toBe("Approval");
      expect(opts.location).toBe("São Paulo");
      expect(opts.policy).toBe("pades-icp-brasil");
   });

   // ── Error path ─────────────────────────────────────────────────────────────

   it("transitions idle → signing → error on failure", async () => {
      mockSignError = "Bad certificate";

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
      mockSignError = "Boom";

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
      mockSignError = "Unknown signing error";

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
      mockSignError = "fail";

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
      let resolveSign!: (value: Uint8Array) => void;
      const holdSign = new Promise<Uint8Array>((res) => {
         resolveSign = res;
      });

      // Override mock to hold until manually resolved
      let signCallCount = 0;
      mock.module("../../src/sign-pdf.ts", () => ({
         signPdf: async () => {
            signCallCount++;
            return holdSign;
         },
      }));

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

      // Second call while first is in progress should be a no-op
      let secondResult: Uint8Array | undefined;
      await act(async () => {
         secondResult = await result.current.sign({
            pdf: makePdf(),
            p12: makeP12(),
            password: "pw",
         });
      });

      expect(secondResult).toBeUndefined();
      expect(signCallCount).toBe(1);

      // Resolve the first sign
      resolveSign(new Uint8Array([9, 9]));
      await act(async () => {
         await firstResult;
      });
      expect(result.current.isDone).toBe(true);

      // Restore default mock for remaining tests
      mock.module("../../src/sign-pdf.ts", () => ({
         signPdf: async (pdf: Uint8Array, options: unknown) => {
            lastSignCall = { pdf, options };
            if (mockSignError !== null) throw new Error(mockSignError);
            return mockSignResult;
         },
      }));
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
