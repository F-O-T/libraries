/**
 * XPath Query Engine
 *
 * Supports a practical subset of XPath 1.0:
 * - Absolute and relative paths: /root/child, child/grandchild
 * - Descendant axis: //element
 * - Wildcards: *, ns:*
 * - Attribute access: @attr, @ns:attr
 * - Predicates: [position], [@attr], [@attr='value'], [element], [element='value']
 * - Text function: text()
 * - Namespace-aware queries with context namespaces
 */

import type {
   XmlDocument,
   XmlElement,
   XmlNode,
   XPathContext,
} from "../../types.ts";
import { XML_NODE_TYPES } from "../../types.ts";
import { getTextContent } from "../../utils.ts";

// =============================================================================
// Public API
// =============================================================================

/**
 * Query an XML document or element using an XPath expression
 *
 * @param node - The document or element to query
 * @param expression - The XPath expression
 * @param context - Optional namespace mappings
 * @returns Array of matching nodes
 */
export function queryXPath(
   node: XmlDocument | XmlElement,
   expression: string,
   context?: XPathContext,
): XmlNode[] {
   const nsMap = context?.namespaces ?? {};
   const expr = expression.trim();
   const isAbsolute = expr.startsWith("/") && !expr.startsWith("//");
   const isDescendantFromRoot = expr.startsWith("//");
   const tokens = tokenizeXPath(expr);

   if (isAbsolute && tokens.length > 0) {
      // For absolute paths like /root/child, the first step should match
      // via "self" axis against the document root element
      const rootNodes: XmlNode[] =
         node.type === XML_NODE_TYPES.DOCUMENT
            ? node.root
               ? [node.root]
               : []
            : [node];

      // First step: filter root nodes by name (self axis)
      const firstStep = tokens[0]!;
      const matchedRoots = filterByNodeTest(
         rootNodes,
         firstStep.nodeTest,
         nsMap,
      );
      const filteredRoots = applyPredicates(
         matchedRoots,
         firstStep.predicates,
         nsMap,
      );

      if (tokens.length === 1) return filteredRoots;
      return evaluateTokens(tokens.slice(1), filteredRoots, nsMap, node);
   }

   if (isDescendantFromRoot) {
      // For //element, search all descendants from root
      const rootNodes: XmlNode[] =
         node.type === XML_NODE_TYPES.DOCUMENT
            ? node.root
               ? [node.root]
               : []
            : [node];
      return evaluateTokens(tokens, rootNodes, nsMap, node);
   }

   const contextNodes =
      node.type === XML_NODE_TYPES.DOCUMENT
         ? node.root
            ? [node.root]
            : []
         : [node];

   return evaluateTokens(tokens, contextNodes, nsMap, node);
}

/**
 * Query and return the first matching node, or null
 */
export function queryXPathFirst(
   node: XmlDocument | XmlElement,
   expression: string,
   context?: XPathContext,
): XmlNode | null {
   const results = queryXPath(node, expression, context);
   return results[0] ?? null;
}

/**
 * Query and return text content of matching nodes
 */
export function queryXPathText(
   node: XmlDocument | XmlElement,
   expression: string,
   context?: XPathContext,
): string[] {
   const results = queryXPath(node, expression, context);
   return results.map((n) => {
      if (n.type === XML_NODE_TYPES.TEXT || n.type === XML_NODE_TYPES.CDATA) {
         return n.value;
      }
      if (n.type === XML_NODE_TYPES.ELEMENT) {
         return getTextContent(n);
      }
      return "";
   });
}

// =============================================================================
// XPath Tokenizer
// =============================================================================

interface XPathStep {
   axis: "child" | "descendant" | "self" | "attribute" | "parent";
   nodeTest: NodeTest;
   predicates: XPathPredicate[];
}

type NodeTest =
   | { type: "name"; name: string; prefix: string | null }
   | { type: "wildcard"; prefix: string | null }
   | { type: "text" }
   | { type: "node" };

type XPathPredicate =
   | { type: "position"; value: number }
   | { type: "attribute_exists"; name: string }
   | { type: "attribute_equals"; name: string; value: string }
   | { type: "element_exists"; name: string }
   | { type: "element_equals"; name: string; value: string };

function tokenizeXPath(expression: string): XPathStep[] {
   const steps: XPathStep[] = [];
   let expr = expression.trim();

   // Handle absolute path - start from root
   if (expr.startsWith("/") && !expr.startsWith("//")) {
      expr = expr.slice(1);
   }

   if (expr.length === 0) return steps;

   const segments = splitPath(expr);

   for (const segment of segments) {
      if (segment === "") {
         // "//" produces an empty segment between slashes
         continue;
      }

      const step = parseStep(segment, expression, segments);
      steps.push(step);
   }

   return steps;
}

function splitPath(expr: string): string[] {
   const parts: string[] = [];
   let current = "";
   let bracketDepth = 0;
   let i = 0;

   while (i < expr.length) {
      const ch = expr[i]!;

      if (ch === "[") {
         bracketDepth++;
         current += ch;
      } else if (ch === "]") {
         bracketDepth--;
         current += ch;
      } else if (ch === "/" && bracketDepth === 0) {
         parts.push(current);
         current = "";
         // Check for "//"
         if (i + 1 < expr.length && expr[i + 1] === "/") {
            parts.push(""); // marker for descendant axis
            i++;
         }
      } else {
         current += ch;
      }
      i++;
   }

   if (current) {
      parts.push(current);
   }

   return parts;
}

function parseStep(
   segment: string,
   _fullExpr: string,
   allSegments: string[],
): XPathStep {
   let axis: XPathStep["axis"] = "child";
   let rest = segment;

   // Check for descendant axis (segment after empty string)
   const segIdx = allSegments.indexOf(segment);
   if (segIdx > 0 && allSegments[segIdx - 1] === "") {
      axis = "descendant";
   }

   // Check for explicit axes
   if (rest === ".") {
      return {
         axis: "self",
         nodeTest: { type: "node" },
         predicates: [],
      };
   }
   if (rest === "..") {
      return {
         axis: "parent",
         nodeTest: { type: "node" },
         predicates: [],
      };
   }
   if (rest.startsWith("@")) {
      axis = "attribute";
      rest = rest.slice(1);
   }

   // Extract predicates
   const predicates: XPathPredicate[] = [];
   while (rest.includes("[")) {
      const bracketStart = rest.indexOf("[");
      const bracketEnd = findMatchingBracket(rest, bracketStart);
      const predExpr = rest.slice(bracketStart + 1, bracketEnd);
      predicates.push(parsePredicate(predExpr));
      rest = rest.slice(0, bracketStart) + rest.slice(bracketEnd + 1);
   }

   // Parse node test
   const nodeTest = parseNodeTest(rest.trim());

   return { axis, nodeTest, predicates };
}

function parseNodeTest(test: string): NodeTest {
   if (test === "*") {
      return { type: "wildcard", prefix: null };
   }
   if (test === "text()") {
      return { type: "text" };
   }
   if (test === "node()") {
      return { type: "node" };
   }
   if (test.endsWith(":*")) {
      return { type: "wildcard", prefix: test.slice(0, -2) };
   }

   const colonIdx = test.indexOf(":");
   if (colonIdx !== -1) {
      return {
         type: "name",
         name: test,
         prefix: test.slice(0, colonIdx),
      };
   }

   return { type: "name", name: test, prefix: null };
}

function parsePredicate(expr: string): XPathPredicate {
   const trimmed = expr.trim();

   // Position predicate: [1], [2], etc.
   const posNum = Number(trimmed);
   if (Number.isInteger(posNum) && posNum > 0) {
      return { type: "position", value: posNum };
   }

   // Attribute exists: [@attr]
   if (trimmed.startsWith("@") && !trimmed.includes("=")) {
      return { type: "attribute_exists", name: trimmed.slice(1) };
   }

   // Attribute equals: [@attr='value'] or [@attr="value"]
   if (trimmed.startsWith("@") && trimmed.includes("=")) {
      const eqIdx = trimmed.indexOf("=");
      const name = trimmed.slice(1, eqIdx).trim();
      const val = trimmed
         .slice(eqIdx + 1)
         .trim()
         .replace(/^['"]|['"]$/g, "");
      return { type: "attribute_equals", name, value: val };
   }

   // Element equals: [element='value']
   if (trimmed.includes("=")) {
      const eqIdx = trimmed.indexOf("=");
      const name = trimmed.slice(0, eqIdx).trim();
      const val = trimmed
         .slice(eqIdx + 1)
         .trim()
         .replace(/^['"]|['"]$/g, "");
      return { type: "element_equals", name, value: val };
   }

   // Element exists: [element]
   return { type: "element_exists", name: trimmed };
}

function findMatchingBracket(str: string, start: number): number {
   let depth = 0;
   for (let i = start; i < str.length; i++) {
      if (str[i] === "[") depth++;
      else if (str[i] === "]") {
         depth--;
         if (depth === 0) return i;
      }
   }
   return str.length - 1;
}

// =============================================================================
// XPath Evaluation
// =============================================================================

function evaluateTokens(
   steps: XPathStep[],
   contextNodes: XmlNode[],
   nsMap: Record<string, string>,
   root: XmlDocument | XmlElement,
): XmlNode[] {
   let currentNodes: XmlNode[] = contextNodes;

   for (const step of steps) {
      const nextNodes: XmlNode[] = [];

      for (const node of currentNodes) {
         const candidates = selectAxis(step.axis, node, root);
         const matched = filterByNodeTest(candidates, step.nodeTest, nsMap);
         const filtered = applyPredicates(matched, step.predicates, nsMap);
         nextNodes.push(...filtered);
      }

      currentNodes = deduplicateNodes(nextNodes);
   }

   return currentNodes;
}

function selectAxis(
   axis: XPathStep["axis"],
   node: XmlNode,
   _root: XmlDocument | XmlElement,
): XmlNode[] {
   switch (axis) {
      case "child":
         if (node.type === XML_NODE_TYPES.ELEMENT) {
            return [...node.children];
         }
         return [];

      case "descendant":
         return collectDescendants(node);

      case "self":
         return [node];

      case "parent":
         if ("parent" in node && node.parent) {
            if (node.parent.type === XML_NODE_TYPES.ELEMENT) {
               return [node.parent];
            }
         }
         return [];

      case "attribute":
         if (node.type === XML_NODE_TYPES.ELEMENT) {
            return [...node.children]; // attributes handled differently
         }
         return [];

      default:
         return [];
   }
}

function collectDescendants(node: XmlNode): XmlNode[] {
   const results: XmlNode[] = [];
   if (node.type === XML_NODE_TYPES.ELEMENT) {
      for (const child of node.children) {
         results.push(child);
         results.push(...collectDescendants(child));
      }
   }
   return results;
}

function filterByNodeTest(
   nodes: XmlNode[],
   test: NodeTest,
   nsMap: Record<string, string>,
): XmlNode[] {
   switch (test.type) {
      case "name":
         return nodes.filter((n) => {
            if (n.type !== XML_NODE_TYPES.ELEMENT) return false;
            // Check by full name or by localName
            if (test.prefix) {
               const uri = nsMap[test.prefix];
               if (uri) {
                  return (
                     n.namespaceUri === uri &&
                     n.localName === test.name.split(":")[1]
                  );
               }
               return n.name === test.name;
            }
            return n.name === test.name || n.localName === test.name;
         });

      case "wildcard":
         return nodes.filter((n) => {
            if (n.type !== XML_NODE_TYPES.ELEMENT) return false;
            if (test.prefix) {
               const uri = nsMap[test.prefix];
               return uri ? n.namespaceUri === uri : n.prefix === test.prefix;
            }
            return true;
         });

      case "text":
         return nodes.filter(
            (n) =>
               n.type === XML_NODE_TYPES.TEXT ||
               n.type === XML_NODE_TYPES.CDATA,
         );

      case "node":
         return nodes;
   }
}

function applyPredicates(
   nodes: XmlNode[],
   predicates: XPathPredicate[],
   _nsMap: Record<string, string>,
): XmlNode[] {
   let result = nodes;

   for (const pred of predicates) {
      switch (pred.type) {
         case "position":
            result =
               pred.value <= result.length ? [result[pred.value - 1]!] : [];
            break;

         case "attribute_exists":
            result = result.filter(
               (n) =>
                  n.type === XML_NODE_TYPES.ELEMENT &&
                  n.attributes.some(
                     (a) => a.name === pred.name || a.localName === pred.name,
                  ),
            );
            break;

         case "attribute_equals":
            result = result.filter(
               (n) =>
                  n.type === XML_NODE_TYPES.ELEMENT &&
                  n.attributes.some(
                     (a) =>
                        (a.name === pred.name || a.localName === pred.name) &&
                        a.value === pred.value,
                  ),
            );
            break;

         case "element_exists":
            result = result.filter(
               (n) =>
                  n.type === XML_NODE_TYPES.ELEMENT &&
                  n.children.some(
                     (c) =>
                        c.type === XML_NODE_TYPES.ELEMENT &&
                        (c.name === pred.name || c.localName === pred.name),
                  ),
            );
            break;

         case "element_equals":
            result = result.filter((n) => {
               if (n.type !== XML_NODE_TYPES.ELEMENT) return false;
               const child = n.children.find(
                  (c) =>
                     c.type === XML_NODE_TYPES.ELEMENT &&
                     (c.name === pred.name || c.localName === pred.name),
               );
               if (!child || child.type !== XML_NODE_TYPES.ELEMENT)
                  return false;
               return getTextContent(child) === pred.value;
            });
            break;
      }
   }

   return result;
}

function deduplicateNodes(nodes: XmlNode[]): XmlNode[] {
   const seen = new Set<XmlNode>();
   return nodes.filter((n) => {
      if (seen.has(n)) return false;
      seen.add(n);
      return true;
   });
}
