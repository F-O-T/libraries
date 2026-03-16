import { describe, expect, it } from "bun:test";
import { drawSignatureAppearance } from "../src/appearance.ts";
import type { SignatureAppearance } from "../src/types.ts";

type DrawImageCall = { x: number; y: number; width: number; height: number };
type DrawTextCall = { text: string; x: number; y: number; size: number };
type DrawLinkCall = {
   text: string;
   url: string;
   x: number;
   y: number;
   size: number;
};

function createFakeEnv(pageHeight = 800) {
   const imageCalls: DrawImageCall[] = [];
   const textCalls: DrawTextCall[] = [];
   const linkCalls: DrawLinkCall[] = [];

   const page = {
      height: pageHeight,
      drawImage: (_img: unknown, opts: DrawImageCall) => {
         imageCalls.push(opts);
      },
      drawText: (
         text: string,
         opts: { x: number; y: number; size: number },
      ) => {
         textCalls.push({ text, x: opts.x, y: opts.y, size: opts.size });
      },
      drawLink: (
         text: string,
         url: string,
         opts: { x: number; y: number; size: number },
      ) => {
         linkCalls.push({ text, url, x: opts.x, y: opts.y, size: opts.size });
      },
   };

   const doc = {
      embedPng: (_png: Uint8Array) => ({ id: "qr" }),
   };

   return { page, doc, imageCalls, textCalls, linkCalls };
}

describe("drawSignatureAppearance", () => {
   it("supports showQrCode:false without skipping cert info and link", () => {
      const { page, doc, imageCalls, textCalls, linkCalls } = createFakeEnv();
      const appearance: SignatureAppearance = {
         x: 50,
         y: 100,
         width: 260,
         height: 80,
         showQrCode: false,
         showCertInfo: true,
      };

      drawSignatureAppearance(doc as never, page as never, appearance, null, {
         pdfData: new Uint8Array([1, 2, 3]),
      });

      expect(imageCalls).toHaveLength(0);
      expect(
         textCalls.some((call) => call.text.includes("ASSINADO DIGITALMENTE")),
      ).toBe(true);
      expect(linkCalls).toHaveLength(1);
   });

   it("applies padding, qrSize, qr offsets, and verticalAlign as one content block", () => {
      const { page, doc, imageCalls, textCalls } = createFakeEnv();
      const appearance: SignatureAppearance = {
         x: 40,
         y: 120,
         width: 300,
         height: 110,
         padding: 10,
         qrSize: 36,
         qrOffsetX: 3,
         qrOffsetY: -2,
         verticalAlign: "middle",
      };

      drawSignatureAppearance(doc as never, page as never, appearance, null, {
         pdfData: new Uint8Array([1, 2, 3]),
         preEmbeddedQr: { id: "qr" } as never,
      });

      expect(imageCalls).toHaveLength(1);
      const qr = imageCalls[0]!;
      const header = textCalls.find(
         (call) => call.text === "ASSINADO DIGITALMENTE",
      );
      expect(header).toBeDefined();

      // QR top edge follows the same content anchor plus configured qrOffsetY.
      expect(qr.y + qr.height).toBe(header!.y + (appearance.qrOffsetY ?? 0));
      expect(qr.width).toBe(36);
      expect(qr.height).toBe(36);
      expect(qr.x).toBe(53);
   });

   it("treats contentAlign as alias for verticalAlign", () => {
      const { page, doc, imageCalls, textCalls } = createFakeEnv();

      const appearance: SignatureAppearance = {
         x: 30,
         y: 90,
         width: 260,
         height: 90,
         contentAlign: "bottom",
         qrSize: 30,
      };

      drawSignatureAppearance(doc as never, page as never, appearance, null, {
         pdfData: new Uint8Array([1]),
         preEmbeddedQr: { id: "qr" } as never,
      });

      expect(imageCalls).toHaveLength(1);
      const qr = imageCalls[0]!;
      const header = textCalls.find(
         (call) => call.text === "ASSINADO DIGITALMENTE",
      );
      expect(header).toBeDefined();
      expect(qr.y + qr.height).toBe(header!.y);
   });
});
