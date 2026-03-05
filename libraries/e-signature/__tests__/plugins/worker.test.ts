import { describe, expect, it } from "bun:test";
import { signPdfInWorker } from "../../src/plugins/worker/index.ts";

class MockWorker {
   // biome-ignore lint/complexity/noBannedTypes: test mock
   private handlers = new Map<string, Function[]>();
   public lastMessage: unknown = null;

   // biome-ignore lint/complexity/noBannedTypes: test mock
   addEventListener(type: string, fn: Function) {
      const list = this.handlers.get(type) ?? [];
      list.push(fn);
      this.handlers.set(type, list);
   }

   // biome-ignore lint/complexity/noBannedTypes: test mock
   removeEventListener(type: string, fn: Function) {
      const list = this.handlers.get(type) ?? [];
      this.handlers.set(
         type,
         list.filter((f) => f !== fn),
      );
   }

   postMessage(data: unknown) {
      this.lastMessage = data;
   }

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
      const options = {
         certificate: { p12: new Uint8Array([1]), password: "test" },
      };

      const promise = signPdfInWorker(
         worker as unknown as Worker,
         pdf,
         options,
      );

      const msg = worker.lastMessage as {
         id: number;
         pdf: Uint8Array;
         options: unknown;
      };
      expect(msg.id).toBeGreaterThan(0);
      expect(msg.pdf).toBeInstanceOf(Uint8Array);

      const signedPdf = new Uint8Array([1, 2, 3]);
      worker.simulateResponse({ id: msg.id, ok: true, result: signedPdf });

      const result = await promise;
      expect(result).toEqual(signedPdf);
   });

   it("rejects when worker reports error", async () => {
      const worker = new MockWorker();
      const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const options = {
         certificate: { p12: new Uint8Array([1]), password: "test" },
      };

      const promise = signPdfInWorker(
         worker as unknown as Worker,
         pdf,
         options,
      );

      const msg = worker.lastMessage as { id: number };
      worker.simulateResponse({
         id: msg.id,
         ok: false,
         error: "bad password",
      });

      await expect(promise).rejects.toThrow("bad password");
   });

   it("rejects on worker error event", async () => {
      const worker = new MockWorker();
      const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const options = {
         certificate: { p12: new Uint8Array([1]), password: "test" },
      };

      const promise = signPdfInWorker(
         worker as unknown as Worker,
         pdf,
         options,
      );
      worker.simulateError("Worker crashed");

      await expect(promise).rejects.toThrow("Worker crashed");
   });

   it("ignores messages with different id", async () => {
      const worker = new MockWorker();
      const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const options = {
         certificate: { p12: new Uint8Array([1]), password: "test" },
      };

      const promise = signPdfInWorker(
         worker as unknown as Worker,
         pdf,
         options,
      );

      const msg = worker.lastMessage as { id: number };
      worker.simulateResponse({
         id: msg.id + 999,
         ok: true,
         result: new Uint8Array([9]),
      });
      worker.simulateResponse({
         id: msg.id,
         ok: true,
         result: new Uint8Array([42]),
      });

      const result = await promise;
      expect(result).toEqual(new Uint8Array([42]));
   });
});
