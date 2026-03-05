# Web Worker PDF Signing Plugin — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `@f-o-t/e-signature/plugins/worker` entry point that runs `signPdf` inside a Web Worker, preventing main-thread freezes in browsers.

**Architecture:** A new plugin with two files — a worker entry script that listens for messages and calls `signPdf`, and a client module that creates an inline Worker (via Blob URL) and provides `signPdfInWorker()` with the same signature as `signPdf`. The inline approach avoids consumers needing to configure worker URLs in their bundler.

**Tech Stack:** Web Workers API, Blob URL for inline worker, `structuredClone`/`Transferable` for zero-copy `Uint8Array` transfer.

---

## Design Decisions

**Inline Worker via Blob URL**: The worker code is embedded as a string in the client bundle. When `signPdfInWorker()` is first called, it creates a Blob URL and spawns the Worker. This is the most portable approach — no bundler config needed, works in Next.js/Vite/webpack out of the box.

**The worker plugin is a separate bundle**: The plugin at `src/plugins/worker/index.ts` is the public API. It imports `signPdf` from `../../sign-pdf.ts`. Because it's built as a plugin entry point, the build system bundles all signing code into the worker plugin's JS file. The client then embeds this bundle as the worker script.

**Wait — that won't work for inline workers.** The inline worker can't import from the main bundle. Instead:

**Revised approach**: The worker plugin exports `signPdfInWorker(workerUrl, pdf, options)` where `workerUrl` points to the worker entry. The library also exports a standalone worker entry file at `@f-o-t/e-signature/plugins/worker/entry`. Consumers create the Worker themselves or pass a URL.

**Actually, simplest approach**: Export `createSignPdfWorker()` that returns a reusable worker wrapper. The consumer is responsible for providing the Worker instance (since they control bundling). The library provides a worker entry file they can reference.

**Final approach — two exports:**

1. `@f-o-t/e-signature/plugins/worker` — client API: `signPdfInWorker(worker, pdf, options)`
2. `@f-o-t/e-signature/plugins/worker-entry` — the script to use as `new Worker(new URL(...))`

This maps cleanly to the plugin system (two plugins: `worker` and `worker-entry`).

---

### Task 1: Create the Worker Entry Plugin

**Files:**
- Create: `libraries/e-signature/src/plugins/worker-entry/index.ts`

**Step 1: Write the worker entry script**

This file self-registers a `message` handler. When loaded as a Worker, it receives `{ id, pdf, options }`, calls `signPdf`, and posts back the result.

```ts
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
if (typeof globalThis.postMessage === "function" && typeof globalThis.onmessage !== "undefined") {
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
```

**Step 2: Commit**

```bash
git add libraries/e-signature/src/plugins/worker-entry/index.ts
git commit -m "feat(e-signature): add worker entry plugin for off-thread signing"
```

---

### Task 2: Create the Worker Client Plugin

**Files:**
- Create: `libraries/e-signature/src/plugins/worker/index.ts`

**Step 1: Write the client API**

```ts
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

    // Transfer the pdf buffer to avoid copying
    const transfer = pdf.buffer instanceof ArrayBuffer ? [pdf.buffer] : [];
    worker.postMessage({ id, pdf, options } satisfies WorkerRequest, { transfer });
  });
}

let nextId = 1;

// Re-export types for convenience
export type { WorkerRequest, WorkerResponse } from "../worker-entry/index.ts";
```

**Step 2: Commit**

```bash
git add libraries/e-signature/src/plugins/worker/index.ts
git commit -m "feat(e-signature): add signPdfInWorker client API"
```

---

### Task 3: Register Plugins in Build Config

**Files:**
- Modify: `libraries/e-signature/fot.config.ts`

**Step 1: Add worker plugins**

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
  plugins: ["react", "worker", "worker-entry"],
});
```

**Step 2: Run `fot generate` to update package.json exports**

```bash
cd libraries/e-signature && bun x --bun fot generate
```

Verify `package.json` now has exports for `./plugins/worker` and `./plugins/worker-entry`.

**Step 3: Build and verify**

```bash
cd libraries/e-signature && bun x --bun fot build
```

Verify `dist/plugins/worker/index.js` and `dist/plugins/worker-entry/index.js` exist.

**Step 4: Commit**

```bash
git add libraries/e-signature/fot.config.ts libraries/e-signature/package.json
git commit -m "feat(e-signature): register worker plugins in build config"
```

---

### Task 4: Write Tests

**Files:**
- Create: `libraries/e-signature/__tests__/plugins/worker.test.ts`

**Step 1: Write the worker client test**

Since `bun:test` runs in Node-like env without real Web Workers, test the message protocol by mocking the Worker interface:

```ts
import { describe, expect, it, mock } from "bun:test";
import { signPdfInWorker } from "../../src/plugins/worker/index.ts";

class MockWorker {
  private handlers = new Map<string, Function[]>();
  public lastMessage: unknown = null;

  addEventListener(type: string, fn: Function) {
    const list = this.handlers.get(type) ?? [];
    list.push(fn);
    this.handlers.set(type, list);
  }

  removeEventListener(type: string, fn: Function) {
    const list = this.handlers.get(type) ?? [];
    this.handlers.set(type, list.filter((f) => f !== fn));
  }

  postMessage(data: unknown) {
    this.lastMessage = data;
  }

  // Simulate worker responding
  simulateResponse(data: unknown) {
    for (const fn of this.handlers.get("message") ?? []) {
      fn({ data });
    }
  }

  simulateError(message: string) {
    for (const fn of this.handlers.get("error") ?? []) {
      fn({ message });
    }
  }
}

describe("signPdfInWorker", () => {
  it("sends pdf and options to worker and resolves with result", async () => {
    const worker = new MockWorker();
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const options = { certificate: { p12: new Uint8Array([1]), password: "test" } };

    const promise = signPdfInWorker(worker as unknown as Worker, pdf, options);

    // Worker should have received the message
    const msg = worker.lastMessage as { id: number; pdf: Uint8Array; options: unknown };
    expect(msg.id).toBeGreaterThan(0);
    expect(msg.pdf).toBeInstanceOf(Uint8Array);

    // Simulate worker completing
    const signedPdf = new Uint8Array([1, 2, 3]);
    worker.simulateResponse({ id: msg.id, ok: true, result: signedPdf });

    const result = await promise;
    expect(result).toEqual(signedPdf);
  });

  it("rejects when worker reports error", async () => {
    const worker = new MockWorker();
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const options = { certificate: { p12: new Uint8Array([1]), password: "test" } };

    const promise = signPdfInWorker(worker as unknown as Worker, pdf, options);

    const msg = worker.lastMessage as { id: number };
    worker.simulateResponse({ id: msg.id, ok: false, error: "bad password" });

    await expect(promise).rejects.toThrow("bad password");
  });

  it("rejects on worker error event", async () => {
    const worker = new MockWorker();
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const options = { certificate: { p12: new Uint8Array([1]), password: "test" } };

    const promise = signPdfInWorker(worker as unknown as Worker, pdf, options);
    worker.simulateError("Worker crashed");

    await expect(promise).rejects.toThrow("Worker crashed");
  });

  it("ignores messages with different id", async () => {
    const worker = new MockWorker();
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const options = { certificate: { p12: new Uint8Array([1]), password: "test" } };

    const promise = signPdfInWorker(worker as unknown as Worker, pdf, options);

    const msg = worker.lastMessage as { id: number };
    // Wrong id — should be ignored
    worker.simulateResponse({ id: msg.id + 999, ok: true, result: new Uint8Array([9]) });
    // Correct id
    worker.simulateResponse({ id: msg.id, ok: true, result: new Uint8Array([42]) });

    const result = await promise;
    expect(result).toEqual(new Uint8Array([42]));
  });
});
```

**Step 2: Run tests**

```bash
cd libraries/e-signature && bun x --bun fot test
```

**Step 3: Commit**

```bash
git add libraries/e-signature/__tests__/plugins/worker.test.ts
git commit -m "test(e-signature): add worker client tests"
```

---

### Task 5: Update README and CHANGELOG, Bump Version

**Files:**
- Modify: `libraries/e-signature/README.md`
- Modify: `libraries/e-signature/CHANGELOG.md`
- Modify: `libraries/e-signature/package.json` (version bump to `1.6.0`)

**Step 1: Add Worker section to README**

Add after the "React Hook" section:

```markdown
## Web Worker Signing

### Why

`signPdf` performs CPU-intensive work (PKCS#12 KDF, PDF parsing, appearance rendering) that blocks the main thread in browsers. For large PDFs or certificates with high iteration counts, this can freeze the UI for several seconds.

### Usage

```ts
import { signPdfInWorker } from "@f-o-t/e-signature/plugins/worker";

// Create a Worker pointing to the worker entry plugin
const worker = new Worker(
  new URL("@f-o-t/e-signature/plugins/worker-entry", import.meta.url),
  { type: "module" },
);

const signed = await signPdfInWorker(worker, pdfBytes, {
  certificate: { p12, password: "secret" },
  appearance: "auto",
  policy: "pades-icp-brasil",
});

// Reuse the worker for multiple signings, or terminate when done
worker.terminate();
```

### `signPdfInWorker(worker, pdf, options)`

Same parameters as `signPdf`, except it takes a `Worker` as the first argument. The PDF bytes are transferred (zero-copy) to the worker thread.

| Parameter | Type | Description |
|---|---|---|
| `worker` | `Worker` | A Worker running the `worker-entry` plugin |
| `pdf` | `Uint8Array` | PDF document bytes |
| `options` | `PdfSignOptions` | Same options as `signPdf()` |
```

**Step 2: Update CHANGELOG.md**

Add at the top:

```markdown
## [1.6.0] - 2026-03-05

### Added

- `@f-o-t/e-signature/plugins/worker` — `signPdfInWorker()` runs PDF signing in a Web Worker to prevent main-thread freezes
- `@f-o-t/e-signature/plugins/worker-entry` — standalone worker entry script for use with `new Worker()`
```

**Step 3: Bump version to `1.6.0` in `package.json`**

**Step 4: Commit**

```bash
git add libraries/e-signature/README.md libraries/e-signature/CHANGELOG.md libraries/e-signature/package.json
git commit -m "chore: release @f-o-t/e-signature@1.6.0"
```

---

### Task 6: Final Build + Check

**Step 1: Full build**

```bash
cd libraries/e-signature && bun x --bun fot build
```

**Step 2: Run check (lint + format)**

```bash
cd libraries/e-signature && bun x --bun fot check
```

**Step 3: Run all tests**

```bash
cd libraries/e-signature && bun x --bun fot test
```

**Step 4: Verify dist exports exist**

```bash
ls libraries/e-signature/dist/plugins/worker/index.js
ls libraries/e-signature/dist/plugins/worker-entry/index.js
```
