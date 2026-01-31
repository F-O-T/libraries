/**
 * XML Digital Signature (XML-DSig)
 *
 * Implements enveloped XML signatures per the W3C XML Signature spec.
 * Supports RSA-SHA1 (legacy SEFAZ) and RSA-SHA256 (modern) algorithms.
 *
 * The signature is inserted inside the signed element as an enveloped signature.
 */

import crypto from "node:crypto";
import type { XmlElement } from "@f-o-t/xml";
import {
   getAttributeValue,
   parseXml,
   serializeXml,
   XML_NODE_TYPES,
} from "@f-o-t/xml";
import { canonicalize } from "@f-o-t/xml/plugins/canonicalize";
import { signOptionsSchema } from "./schemas.ts";
import type { SignatureAlgorithm, SignOptions } from "./types.ts";
import {
   DIGEST_ALGORITHMS,
   EXC_C14N_NS,
   pemToBase64,
   SIGNATURE_ALGORITHMS,
   TRANSFORM_ALGORITHMS,
   XMLDSIG_NS,
} from "./utils.ts";

// =============================================================================
// Public API
// =============================================================================

/**
 * Sign an XML document with an enveloped XML-DSig signature
 *
 * @param xml - The XML string to sign
 * @param options - Signing options (certificate, reference URI, algorithm)
 * @returns The signed XML string
 */
export function signXml(xml: string, options: SignOptions): string {
   const opts = signOptionsSchema.parse(options);
   const algorithm = opts.algorithm;

   // Parse the XML document
   const doc = parseXml(xml);
   if (!doc.root) {
      throw new Error("XML document has no root element");
   }

   // Find the element to sign (by URI reference)
   const targetElement = findSignTarget(doc.root, opts.referenceUri);
   if (!targetElement) {
      throw new Error(
         `Could not find element with URI reference: ${opts.referenceUri}`,
      );
   }

   // Step 1: Compute the digest of the canonicalized target element
   // (After applying enveloped signature transform — which means excluding
   // any existing Signature element, which doesn't exist yet)
   const canonicalXml = canonicalize(targetElement, {
      exclusive: true,
      withComments: false,
   });
   const digestValue = computeDigest(canonicalXml, algorithm);

   // Step 2: Build the SignedInfo element
   const signedInfoXml = buildSignedInfoXml(
      opts.referenceUri,
      algorithm,
      digestValue,
   );

   // Step 3: Canonicalize SignedInfo and sign it
   const signedInfoDoc = parseXml(signedInfoXml);
   const canonicalSignedInfo = canonicalize(signedInfoDoc.root!, {
      exclusive: true,
      withComments: false,
   });
   const signatureValue = computeSignature(
      canonicalSignedInfo,
      options.certificate.keyPem,
      algorithm,
   );

   // Step 4: Build the complete Signature element
   const signatureXml = buildSignatureXml(
      signedInfoXml,
      signatureValue,
      options.certificate.certPem,
   );

   // Step 5: Insert the Signature into the target element
   const signatureDoc = parseXml(signatureXml);
   const signatureElement = signatureDoc.root!;

   // Find the parent where we should insert the signature
   const signatureParent = opts.signatureParent
      ? findElementByName(doc.root, opts.signatureParent)
      : targetElement;

   if (!signatureParent) {
      throw new Error(
         `Could not find signature parent element: ${opts.signatureParent}`,
      );
   }

   // Set parent reference and append
   signatureElement.parent = signatureParent;
   signatureParent.children.push(signatureElement);

   // Step 6: Serialize the signed document
   return serializeXml(doc, {
      declaration: opts.includeDeclaration,
      indent: "",
      selfClose: true,
   });
}

// =============================================================================
// Internal Helpers
// =============================================================================

function findSignTarget(
   root: XmlElement,
   referenceUri: string,
): XmlElement | null {
   // URI can be "#id" (fragment) or "" (entire document)
   if (referenceUri === "") {
      return root;
   }

   const id = referenceUri.startsWith("#")
      ? referenceUri.slice(1)
      : referenceUri;

   return findElementById(root, id);
}

function findElementById(element: XmlElement, id: string): XmlElement | null {
   // Check common ID attribute names
   const idAttrs = ["Id", "id", "ID"];
   for (const attrName of idAttrs) {
      const val = getAttributeValue(element, attrName);
      if (val === id) return element;
   }

   // Recurse into children
   for (const child of element.children) {
      if (child.type === XML_NODE_TYPES.ELEMENT) {
         const found = findElementById(child, id);
         if (found) return found;
      }
   }

   return null;
}

function findElementByName(
   element: XmlElement,
   name: string,
): XmlElement | null {
   if (element.name === name || element.localName === name) {
      return element;
   }
   for (const child of element.children) {
      if (child.type === XML_NODE_TYPES.ELEMENT) {
         const found = findElementByName(child, name);
         if (found) return found;
      }
   }
   return null;
}

function computeDigest(data: string, algorithm: SignatureAlgorithm): string {
   const algo = DIGEST_ALGORITHMS[algorithm];
   const hash = crypto.createHash(algo.nodeAlgo);
   hash.update(data, "utf8");
   return hash.digest("base64");
}

function computeSignature(
   data: string,
   privateKeyPem: string,
   algorithm: SignatureAlgorithm,
): string {
   const algo = SIGNATURE_ALGORITHMS[algorithm];
   const sign = crypto.createSign(`RSA-${algo.nodeAlgo.toUpperCase()}`);
   sign.update(data, "utf8");
   return sign.sign(privateKeyPem, "base64");
}

function buildSignedInfoXml(
   referenceUri: string,
   algorithm: SignatureAlgorithm,
   digestValue: string,
): string {
   const sigAlgo = SIGNATURE_ALGORITHMS[algorithm];
   const digAlgo = DIGEST_ALGORITHMS[algorithm];

   return `<SignedInfo xmlns="${XMLDSIG_NS}"><CanonicalizationMethod Algorithm="${EXC_C14N_NS}"/><SignatureMethod Algorithm="${sigAlgo.uri}"/><Reference URI="${referenceUri}"><Transforms><Transform Algorithm="${TRANSFORM_ALGORITHMS.envelopedSignature}"/><Transform Algorithm="${TRANSFORM_ALGORITHMS.excC14n}"/></Transforms><DigestMethod Algorithm="${digAlgo.uri}"/><DigestValue>${digestValue}</DigestValue></Reference></SignedInfo>`;
}

function buildSignatureXml(
   signedInfoXml: string,
   signatureValue: string,
   certPem: string,
): string {
   const certBase64 = pemToBase64(certPem);

   return `<Signature xmlns="${XMLDSIG_NS}">${signedInfoXml}<SignatureValue>${signatureValue}</SignatureValue><KeyInfo><X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data></KeyInfo></Signature>`;
}
