import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCertificate } from "../src/certificate.ts";
import { signXml } from "../src/xml-signer.ts";

const fixturesDir = join(import.meta.dir, "fixtures");
const testPfx = readFileSync(join(fixturesDir, "test-certificate.pfx"));
const testPassword = "test1234";

const sampleNfse = `<?xml version="1.0" encoding="UTF-8"?>
<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Nfse>
    <InfNfse Id="nfse_123">
      <Numero>123</Numero>
      <CodigoVerificacao>ABC123</CodigoVerificacao>
      <Competencia>2024-01</Competencia>
      <Servico>
        <Valores>
          <ValorServicos>1000.00</ValorServicos>
        </Valores>
        <Discriminacao>Consultoria em TI</Discriminacao>
      </Servico>
    </InfNfse>
  </Nfse>
</CompNfse>`;

describe("signXml", () => {
   const cert = parseCertificate(testPfx, testPassword);

   it("signs an XML document with SHA-256", () => {
      const signed = signXml(sampleNfse, {
         certificate: cert,
         referenceUri: "#nfse_123",
         algorithm: "sha256",
      });

      expect(signed).toContain("<Signature");
      expect(signed).toContain("</Signature>");
      expect(signed).toContain("<SignedInfo");
      expect(signed).toContain("<SignatureValue>");
      expect(signed).toContain("<DigestValue>");
      expect(signed).toContain("<X509Certificate>");
   });

   it("signs an XML document with SHA-1", () => {
      const signed = signXml(sampleNfse, {
         certificate: cert,
         referenceUri: "#nfse_123",
         algorithm: "sha1",
      });

      expect(signed).toContain("xmldsig#rsa-sha1");
      expect(signed).toContain("xmldsig#sha1");
   });

   it("includes correct algorithm URIs for SHA-256", () => {
      const signed = signXml(sampleNfse, {
         certificate: cert,
         referenceUri: "#nfse_123",
         algorithm: "sha256",
      });

      expect(signed).toContain("rsa-sha256");
      expect(signed).toContain("xmlenc#sha256");
   });

   it("includes enveloped signature transform", () => {
      const signed = signXml(sampleNfse, {
         certificate: cert,
         referenceUri: "#nfse_123",
      });

      expect(signed).toContain(
         "xmldsig#enveloped-signature",
      );
   });

   it("includes exclusive C14N transform", () => {
      const signed = signXml(sampleNfse, {
         certificate: cert,
         referenceUri: "#nfse_123",
      });

      expect(signed).toContain("xml-exc-c14n#");
   });

   it("includes X509 certificate data in KeyInfo", () => {
      const signed = signXml(sampleNfse, {
         certificate: cert,
         referenceUri: "#nfse_123",
      });

      expect(signed).toContain("<KeyInfo>");
      expect(signed).toContain("<X509Data>");
      expect(signed).toContain("<X509Certificate>");
   });

   it("includes the reference URI", () => {
      const signed = signXml(sampleNfse, {
         certificate: cert,
         referenceUri: "#nfse_123",
      });

      expect(signed).toContain('URI="#nfse_123"');
   });

   it("throws for non-existent reference URI", () => {
      expect(() =>
         signXml(sampleNfse, {
            certificate: cert,
            referenceUri: "#nonexistent",
         }),
      ).toThrow("Could not find element");
   });

   it("preserves the original XML structure", () => {
      const signed = signXml(sampleNfse, {
         certificate: cert,
         referenceUri: "#nfse_123",
      });

      expect(signed).toContain("<Numero>123</Numero>");
      expect(signed).toContain("<CodigoVerificacao>ABC123</CodigoVerificacao>");
      expect(signed).toContain("Consultoria em TI");
   });

   it("defaults to SHA-256 algorithm", () => {
      const signed = signXml(sampleNfse, {
         certificate: cert,
         referenceUri: "#nfse_123",
      });

      expect(signed).toContain("rsa-sha256");
   });

   it("produces different signatures for different content", () => {
      const xml1 = '<root Id="a"><data>value1</data></root>';
      const xml2 = '<root Id="a"><data>value2</data></root>';

      const signed1 = signXml(xml1, {
         certificate: cert,
         referenceUri: "#a",
         includeDeclaration: false,
      });

      const signed2 = signXml(xml2, {
         certificate: cert,
         referenceUri: "#a",
         includeDeclaration: false,
      });

      // Extract DigestValue from both
      const digest1 = signed1.match(
         /<DigestValue>([^<]+)<\/DigestValue>/,
      )?.[1];
      const digest2 = signed2.match(
         /<DigestValue>([^<]+)<\/DigestValue>/,
      )?.[1];

      expect(digest1).not.toBe(digest2);
   });
});
