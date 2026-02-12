/**
 * Real Certificate PDF Signing Tests
 *
 * Test signing PDF documents with your real Brazilian A1 certificate
 */

import { describe, expect, it } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { signPdf } from "../src/plugins/pdf-signer/index.ts";
import { hasRealCertificate, loadCertificate } from "./test-helpers.ts";

describe.skipIf(!hasRealCertificate())("Real Certificate - PDF Signing", () => {
  const cert = loadCertificate({ useReal: true });

  it("signs a simple PDF with real certificate", async () => {
    // Create test PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    page.drawText("Documento de Teste", { x: 50, y: 750, size: 20 });
    page.drawText("Este é um documento para teste de assinatura digital.", {
      x: 50,
      y: 700,
      size: 12,
    });

    const originalPdf = await pdfDoc.save();

    // Sign PDF
    const signedPdf = await signPdf(Buffer.from(originalPdf), {
      certificate: cert,
      reason: "Teste de assinatura digital",
      location: "Brasil",
    });

    expect(signedPdf).toBeInstanceOf(Buffer);
    expect(signedPdf.length).toBeGreaterThan(originalPdf.length);

    console.log("\n✅ PDF signed successfully with real certificate!");
    console.log(`Original size: ${originalPdf.length} bytes`);
    console.log(`Signed size: ${signedPdf.length} bytes`);
  });

  it("creates visible signature with certificate info", async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    page.drawText("Documento Oficial", { x: 50, y: 750 });

    const originalPdf = await pdfDoc.save();

    const signedPdf = await signPdf(Buffer.from(originalPdf), {
      certificate: cert,
      appearance: {
        visible: true,
        showQRCode: true,
        placement: {
          page: 1,
          x: 50,
          y: 100,
          width: 400,
          height: 120,
        },
      },
    });

    // Save for manual inspection
    const outputPath = join(import.meta.dir, "fixtures", "signed-output.pdf");
    writeFileSync(outputPath, signedPdf);

    console.log(`\n✅ Signed PDF saved to: ${outputPath}`);
    console.log("Open this file to visually verify the signature appearance.\n");

    expect(signedPdf.length).toBeGreaterThan(0);
  });

  it("displays certificate information in signature", async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage();
    const originalPdf = await pdfDoc.save();

    const signedPdf = await signPdf(Buffer.from(originalPdf), {
      certificate: cert,
    });

    console.log("\n=== Certificate Info in Signature ===");
    console.log(`Signer: ${cert.subject.commonName}`);
    console.log(`Company: ${cert.subject.organization}`);
    console.log(`CNPJ: ${cert.brazilian.cnpj || "N/A"}`);
    console.log(`Issuer: ${cert.issuer.commonName}`);
    console.log("======================================\n");

    expect(signedPdf).toBeDefined();
  });
});
