# `useSignPdf` React Hook Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Export a `useSignPdf` React hook from `@f-o-t/e-signature/plugins/react` that lets browser consumers sign PDFs client-side with full state tracking.

**Architecture:** A new plugin entry point `src/plugins/react/index.ts` exports the hook and its types. The hook wraps `signPdf` in a `useCallback`, tracks state with `useReducer`, and converts `File`/`Blob` inputs to `Uint8Array` before signing. React is declared as a `peerDependency` and marked `external` in the build config so the library ships zero React bytes.

**Tech Stack:** TypeScript, React 18+ (peer), `bun:test` for unit tests, `@testing-library/react` for hook tests, `bun x --bun fot build` for the build step.

---

## Codebase Context

```
libraries/e-signature/
  src/
    index.ts                          ← main entry; do NOT add hook here
    sign-pdf.ts                       ← signPdf(pdf, options): Promise<Uint8Array>
    types.ts                          ← PdfSignOptions, SignatureAppearance, QrCodeConfig
    batch.ts                          ← existing plugin pattern example
    plugins/                          ← does NOT exist yet; we create it
      react/
        index.ts                      ← NEW: useSignPdf hook + types
  __tests__/
    plugins/
      react.test.tsx                  ← NEW: hook tests
  fot.config.ts                       ← add 'react' to plugins array
  package.json                        ← add react peerDependency
```

### How plugins work in this repo

`fot.config.ts` lists plugin names in `plugins: ['react']`. The build tool (`fot build`) automatically generates an additional entry point at `dist/plugins/react/index.js` and adds the corresponding `"./plugins/react"` export to the built package. So:
- Adding `'react'` to `plugins` in `fot.config.ts` is **all** that's needed for the build wiring.
- No manual edits to `package.json` exports or `tsconfig.json` — those are auto-generated.

### signPdf signature (what the hook wraps)

```ts
// src/sign-pdf.ts
export async function signPdf(
  pdf: Uint8Array | ReadableStream<Uint8Array>,
  options: PdfSignOptions,
): Promise<Uint8Array>

// PdfSignOptions (abbreviated)
type PdfSignOptions = {
  certificate: { p12: Uint8Array; password: string; name?: string };
  reason?: string;
  location?: string;
  contactInfo?: string;
  policy?: "pades-ades" | "pades-icp-brasil";
  timestamp?: boolean;
  tsaUrl?: string;
  tsaTimeout?: number;
  tsaRetries?: number;
  tsaFallbackUrls?: string[];
  onTimestampError?: (error: unknown) => void;
  appearance?: SignatureAppearance | false;
  appearances?: SignatureAppearance[];
  qrCode?: QrCodeConfig;
  docMdpPermission?: 1 | 2 | 3;
};
```

---

## Task 1: Install `@testing-library/react` as a dev dependency

**Files:**
- Modify: `libraries/e-signature/package.json`

**Step 1: Add devDependencies**

In `libraries/e-signature/package.json`, add to `devDependencies`:

```json
"react": "^18.0.0",
"react-dom": "^18.0.0",
"@testing-library/react": "^16.0.0",
"@types/react": "^18.0.0",
"@types/react-dom": "^18.0.0"
```

**Step 2: Install**

```bash
cd libraries/e-signature && bun install
```

Expected: lock file updated, no errors.

**Step 3: Commit**

```bash
git add libraries/e-signature/package.json bun.lockb
git commit -m "chore(e-signature): add @testing-library/react dev deps for hook plugin tests"
```

---

## Task 2: Declare the plugin entry point in `fot.config.ts`

**Files:**
- Modify: `libraries/e-signature/fot.config.ts`

**Step 1: Add `'react'` to the plugins array and `'react'` to external**

Replace the entire file content with:

```ts
import { defineFotConfig } from "@f-o-t/config";

export default defineFotConfig({
  external: [
    "zod",
    "@f-o-t/asn1",
    "@f-o-t/crypto",
    "@f-o-t/qrcode",
    "@f-o-t/pdf",
    "@f-o-t/digital-certificate",
    "react",
  ],
  plugins: ["react"],
});
```

**Step 2: Verify the build generates the plugin entry point**

```bash
cd libraries/e-signature && bun x --bun fot build
```

Expected output includes lines like:
```
Building 2 entry point(s)...
✓ esm format built successfully
✓ TypeScript declarations generated
```

And `dist/plugins/react/index.js` now exists:

```bash
ls libraries/e-signature/dist/plugins/react/
# index.js  index.d.ts
```

**Step 3: Commit**

```bash
git add libraries/e-signature/fot.config.ts
git commit -m "chore(e-signature): register react plugin entry point in fot.config"
```

---

## Task 3: Declare React as a `peerDependency` in `package.json`

**Files:**
- Modify: `libraries/e-signature/package.json`

**Step 1: Add `peerDependencies` block**

Add this block to `libraries/e-signature/package.json` (after `devDependencies`):

```json
"peerDependencies": {
  "react": ">=18.0.0"
},
"peerDependenciesMeta": {
  "react": {
    "optional": true
  }
}
```

The `optional: true` means consumers without React won't see a peer warning — the hook is opt-in via the sub-path import.

**Step 2: Commit**

```bash
git add libraries/e-signature/package.json
git commit -m "chore(e-signature): declare react as optional peerDependency for hook plugin"
```

---

## Task 4: Write the failing hook tests

**Files:**
- Create: `libraries/e-signature/__tests__/plugins/react.test.tsx`

**Step 1: Create the test directory and file**

```bash
mkdir -p libraries/e-signature/__tests__/plugins
```

Write `libraries/e-signature/__tests__/plugins/react.test.tsx`:

```tsx
/**
 * useSignPdf hook tests
 *
 * Tests run with bun:test + @testing-library/react.
 * signPdf is mocked to avoid real crypto work in unit tests.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, mock, beforeEach } from "bun:test";

// ── Mock signPdf before importing the hook ───────────────────────────────────
const mockSignPdf = mock(async (_pdf: Uint8Array, _opts: unknown) =>
  new Uint8Array([1, 2, 3, 4]),
);

mock.module("../../src/sign-pdf.ts", () => ({
  signPdf: mockSignPdf,
  PdfSignError: class PdfSignError extends Error {
    constructor(msg: string) { super(msg); this.name = "PdfSignError"; }
  },
}));

// Import AFTER mocking
import { useSignPdf } from "../../src/plugins/react/index.ts";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeP12(): Uint8Array { return new Uint8Array([0xde, 0xad, 0xbe, 0xef]); }
function makePdf(): Uint8Array { return new Uint8Array([0x25, 0x50, 0x44, 0x46]); } // %PDF

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

    const [calledPdf, calledOpts] = mockSignPdf.mock.calls[0] as [Uint8Array, { certificate: { p12: Uint8Array; password: string } }];
    expect(calledPdf).toEqual(pdf);
    expect(calledOpts.certificate.p12).toEqual(p12);
    expect(calledOpts.certificate.password).toBe("pw");
  });

  it("converts File input to Uint8Array before calling signPdf", async () => {
    const pdfBytes = makePdf();
    const pdfFile = new File([pdfBytes], "doc.pdf", { type: "application/pdf" });
    const p12Bytes = makeP12();
    const p12File = new File([p12Bytes], "cert.p12");

    const { result } = renderHook(() => useSignPdf());

    await act(async () => {
      await result.current.sign({ pdf: pdfFile, p12: p12File, password: "pw" });
    });

    const [calledPdf, calledOpts] = mockSignPdf.mock.calls[0] as [Uint8Array, { certificate: { p12: Uint8Array } }];
    expect(calledPdf).toEqual(pdfBytes);
    expect(calledOpts.certificate.p12).toEqual(p12Bytes);
  });

  it("converts Blob input to Uint8Array before calling signPdf", async () => {
    const pdfBytes = makePdf();
    const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

    const { result } = renderHook(() => useSignPdf());

    await act(async () => {
      await result.current.sign({ pdf: pdfBlob, p12: makeP12(), password: "pw" });
    });

    const [calledPdf] = mockSignPdf.mock.calls[0] as [Uint8Array];
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

    const [, calledOpts] = mockSignPdf.mock.calls[0] as [unknown, { reason: string; location: string; policy: string }];
    expect(calledOpts.reason).toBe("Approval");
    expect(calledOpts.location).toBe("São Paulo");
    expect(calledOpts.policy).toBe("pades-icp-brasil");
  });

  // ── Error path ─────────────────────────────────────────────────────────────

  it("transitions idle → signing → error on failure", async () => {
    const signingError = new Error("Bad certificate");
    mockSignPdf.mockImplementationOnce(async () => { throw signingError; });

    const { result } = renderHook(() => useSignPdf());

    await act(async () => {
      await result.current.sign({ pdf: makePdf(), p12: makeP12(), password: "bad" })
        .catch(() => {/* expected */});
    });

    expect(result.current.status).toBe("error");
    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe("Bad certificate");
    expect(result.current.result).toBeNull();
  });

  it("re-throws the error so callers can handle it", async () => {
    mockSignPdf.mockImplementationOnce(async () => { throw new Error("Boom"); });

    const { result } = renderHook(() => useSignPdf());

    let thrown: Error | null = null;
    await act(async () => {
      try {
        await result.current.sign({ pdf: makePdf(), p12: makeP12(), password: "pw" });
      } catch (e) {
        thrown = e as Error;
      }
    });

    expect(thrown?.message).toBe("Boom");
  });

  it("wraps non-Error throws in a plain Error", async () => {
    mockSignPdf.mockImplementationOnce(async () => { throw "string error"; });

    const { result } = renderHook(() => useSignPdf());

    await act(async () => {
      await result.current.sign({ pdf: makePdf(), p12: makeP12(), password: "pw" })
        .catch(() => {});
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Unknown signing error");
  });

  // ── reset ──────────────────────────────────────────────────────────────────

  it("reset() returns to idle state after done", async () => {
    const { result } = renderHook(() => useSignPdf());

    await act(async () => {
      await result.current.sign({ pdf: makePdf(), p12: makeP12(), password: "pw" });
    });
    expect(result.current.isDone).toBe(true);

    act(() => { result.current.reset(); });

    expect(result.current.status).toBe("idle");
    expect(result.current.result).toBeNull();
  });

  it("reset() returns to idle state after error", async () => {
    mockSignPdf.mockImplementationOnce(async () => { throw new Error("fail"); });

    const { result } = renderHook(() => useSignPdf());

    await act(async () => {
      await result.current.sign({ pdf: makePdf(), p12: makeP12(), password: "pw" })
        .catch(() => {});
    });
    expect(result.current.isError).toBe(true);

    act(() => { result.current.reset(); });

    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  // ── Concurrent call guard ──────────────────────────────────────────────────

  it("ignores a second sign() call while already signing", async () => {
    let resolveFirst!: (v: Uint8Array) => void;
    const firstPromise = new Promise<Uint8Array>((res) => { resolveFirst = res; });
    mockSignPdf.mockImplementationOnce(() => firstPromise);

    const { result } = renderHook(() => useSignPdf());

    // Start first sign — do not await yet
    let firstResult: Promise<Uint8Array | undefined> | undefined;
    act(() => { firstResult = result.current.sign({ pdf: makePdf(), p12: makeP12(), password: "pw" }); });

    // Attempt second sign while first is in progress
    let secondResult: Uint8Array | undefined;
    await act(async () => {
      secondResult = await result.current.sign({ pdf: makePdf(), p12: makeP12(), password: "pw" });
    });

    // Second call should be a no-op (returns undefined, no additional signPdf call)
    expect(secondResult).toBeUndefined();
    expect(mockSignPdf).toHaveBeenCalledTimes(1);

    // Resolve the first sign
    resolveFirst(new Uint8Array([9, 9]));
    await act(async () => { await firstResult; });
    expect(result.current.isDone).toBe(true);
  });

  // ── download helper ────────────────────────────────────────────────────────

  it("download() creates and clicks an <a> element with a blob URL", async () => {
    const { result } = renderHook(() => useSignPdf());

    await act(async () => {
      await result.current.sign({ pdf: makePdf(), p12: makeP12(), password: "pw" });
    });

    // Mock URL.createObjectURL / revokeObjectURL
    const mockUrl = "blob:http://localhost/fake-uuid";
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const clickMock = mock(() => {});

    URL.createObjectURL = mock(() => mockUrl);
    URL.revokeObjectURL = mock(() => {});

    const appendMock = mock((el: HTMLElement) => { el.click = clickMock; });
    document.body.appendChild = appendMock as unknown as typeof document.body.appendChild;
    document.body.removeChild = mock(() => document.body) as unknown as typeof document.body.removeChild;

    act(() => { result.current.download("output.pdf"); });

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);

    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it("download() is a no-op when status is not done", () => {
    const { result } = renderHook(() => useSignPdf());
    const appendMock = mock(() => {});
    document.body.appendChild = appendMock as unknown as typeof document.body.appendChild;

    act(() => { result.current.download("output.pdf"); });

    expect(appendMock).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run the tests to confirm they fail (the implementation doesn't exist yet)**

```bash
cd libraries/e-signature && bun test __tests__/plugins/react.test.tsx 2>&1
```

Expected: Error like `Cannot find module '../../src/plugins/react/index.ts'` — confirms we need to write the implementation.

**Step 3: Commit the failing tests**

```bash
git add libraries/e-signature/__tests__/plugins/react.test.tsx
git commit -m "test(e-signature): add failing tests for useSignPdf hook plugin"
```

---

## Task 5: Implement the `useSignPdf` hook

**Files:**
- Create: `libraries/e-signature/src/plugins/react/index.ts`

**Step 1: Create the directory**

```bash
mkdir -p libraries/e-signature/src/plugins/react
```

**Step 2: Write `src/plugins/react/index.ts`**

```ts
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

import { useCallback, useReducer } from "react";
import { signPdf } from "../../sign-pdf.ts";
import type { PdfSignOptions } from "../../types.ts";

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

  const sign = useCallback(async (input: SignInput): Promise<Uint8Array | undefined> => {
    // Guard: do nothing if already signing
    if (state.status === "signing") return undefined;

    dispatch({ type: "START" });

    try {
      const pdfBytes = await toUint8Array(input.pdf);
      const p12Bytes = await toUint8Array(input.p12);

      const signed = await signPdf(pdfBytes, {
        ...input.options,
        certificate: {
          p12: p12Bytes,
          password: input.password,
        },
      });

      dispatch({ type: "SUCCESS", result: signed });
      return signed;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown signing error");
      dispatch({ type: "FAILURE", error });
      throw error;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  const download = useCallback((filename = "signed.pdf") => {
    if (state.status !== "done") return;
    const blob = new Blob([state.result], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state]);

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    status: state.status,
    isIdle:    state.status === "idle",
    isSigning: state.status === "signing",
    isDone:    state.status === "done",
    isError:   state.status === "error",
    result:    state.status === "done"  ? state.result : null,
    error:     state.status === "error" ? state.error  : null,
    sign,
    download,
    reset,
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function toUint8Array(source: ByteSource): Promise<Uint8Array> {
  if (source instanceof Uint8Array) return source;
  return new Uint8Array(await source.arrayBuffer());
}
```

**Step 3: Run the tests — expect them to pass**

```bash
cd libraries/e-signature && bun test __tests__/plugins/react.test.tsx 2>&1
```

Expected:
```
✓ starts in idle state
✓ transitions idle → signing → done on success
... (all tests pass)
 N pass
 0 fail
```

If a test fails, read the error carefully. Common issues:
- `mock.module` path must be relative to the test file — `"../../src/sign-pdf.ts"` is correct.
- `act()` must wrap all state-changing calls including `reset()`.

**Step 4: Run the full e-signature test suite to ensure nothing regressed**

```bash
cd libraries/e-signature && bun x --bun fot test 2>&1 | tail -5
```

Expected: all existing tests still pass.

**Step 5: Commit**

```bash
git add libraries/e-signature/src/plugins/react/index.ts
git commit -m "feat(e-signature): add useSignPdf React hook plugin"
```

---

## Task 6: Build and verify the plugin entry point is emitted

**Files:**
- No new files; validates build output.

**Step 1: Run the build**

```bash
cd libraries/e-signature && bun x --bun fot build 2>&1
```

Expected:
```
Building 2 entry point(s)...
✓ esm format built successfully
✓ TypeScript declarations generated
```

**Step 2: Confirm plugin artefacts exist**

```bash
ls libraries/e-signature/dist/plugins/react/
```

Expected: `index.js` and `index.d.ts`.

**Step 3: Spot-check the type declaration**

```bash
grep -n "useSignPdf\|SignInput\|UseSignPdfReturn\|ByteSource" \
  libraries/e-signature/dist/plugins/react/index.d.ts
```

Expected: all four names present.

**Step 4: Commit**

```bash
git add libraries/e-signature/dist/
git commit -m "build(e-signature): emit useSignPdf plugin artefacts"
```

---

## Task 7: Update CHANGELOG, README, and bump to patch version `1.3.0`

> This is a MINOR release (`1.2.9 → 1.3.0`) because a new plugin entry point and exported API were added.

**Files:**
- Modify: `libraries/e-signature/CHANGELOG.md`
- Modify: `libraries/e-signature/README.md`
- Modify: `libraries/e-signature/package.json`

**Step 1: Prepend to `CHANGELOG.md`**

Add above the `[1.2.9]` entry:

```md
## [1.3.0] - 2026-02-19

### Added
- `@f-o-t/e-signature/plugins/react` — new sub-path plugin exporting `useSignPdf` React hook
- `useSignPdf(): UseSignPdfReturn` — React 18+ hook for client-side PDF signing; manages the full `idle → signing → done / error` lifecycle with `useReducer`, converts `File`/`Blob`/`Uint8Array` inputs, guards against concurrent calls, and exposes a `download(filename?)` helper for browser downloads
- `SignInput`, `UseSignPdfReturn`, `ByteSource`, `SigningStatus` types exported from the plugin
- `react >=18.0.0` declared as optional `peerDependency`
```

**Step 2: Add React Hook section to `README.md`**

Append before the `## Constants` section:

````md
## React Hook

```bash
bun add @f-o-t/e-signature react
```

```tsx
import { useSignPdf } from "@f-o-t/e-signature/plugins/react";

function SignDocumentForm() {
  const { sign, isSigning, isDone, isError, result, error, download, reset } = useSignPdf();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await sign({
      pdf:      form.get("pdf")      as File,
      p12:      form.get("cert")     as File,
      password: form.get("password") as string,
      options: {
        reason: "Document approval",
        policy: "pades-icp-brasil",
        appearance: { x: 50, y: 50, width: 220, height: 80, page: 0 },
      },
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="pdf"      type="file" accept=".pdf"      required />
      <input name="cert"     type="file" accept=".p12,.pfx" required />
      <input name="password" type="password"                required />
      <button type="submit" disabled={isSigning}>
        {isSigning ? "Signing…" : "Sign"}
      </button>
      {isDone  && <button type="button" onClick={() => download("signed.pdf")}>Download</button>}
      {isError && <p>Error: {error?.message}</p>}
    </form>
  );
}
```

### `useSignPdf` API

```ts
const {
  // State
  status,    // "idle" | "signing" | "done" | "error"
  isIdle,    // status === "idle"
  isSigning, // status === "signing"
  isDone,    // status === "done"
  isError,   // status === "error"
  result,    // Uint8Array | null  — the signed PDF bytes, non-null when isDone
  error,     // Error | null       — non-null when isError

  // Actions
  sign,      // (input: SignInput) => Promise<Uint8Array | undefined>
  download,  // (filename?: string) => void  — triggers browser download when isDone
  reset,     // () => void          — returns to idle, clears result/error
} = useSignPdf();
```

**`SignInput`:**

```ts
type SignInput = {
  pdf:      File | Blob | Uint8Array;
  p12:      File | Blob | Uint8Array;
  password: string;
  options?: Omit<PdfSignOptions, "certificate">;
};
```

**Notes:**
- Concurrent calls are ignored: calling `sign()` while already signing returns `undefined` immediately.
- `sign()` re-throws on failure after setting state to `"error"` — wrap in `try/catch` if you need per-call error handling.
- `download()` is a no-op when `status !== "done"`.
````

**Step 3: Bump version in `package.json`**

Change `"version": "1.2.9"` → `"version": "1.3.0"`.

**Step 4: Add the comparison link to `CHANGELOG.md`**

```md
[1.3.0]: https://github.com/F-O-T/libraries/compare/@f-o-t/e-signature@1.2.9...@f-o-t/e-signature@1.3.0
```

**Step 5: Commit**

```bash
git add libraries/e-signature/CHANGELOG.md \
        libraries/e-signature/README.md \
        libraries/e-signature/package.json
git commit -m "chore: release @f-o-t/e-signature@1.3.0"
```

---

## Final Verification

Run the full test suite and build one last time to confirm everything is green:

```bash
cd libraries/e-signature && bun x --bun fot test 2>&1 | tail -8
cd libraries/e-signature && bun x --bun fot build 2>&1
```

Expected: all tests pass, build succeeds, `dist/plugins/react/index.js` present.
