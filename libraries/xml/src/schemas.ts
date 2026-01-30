/**
 * Zod schemas for XML configuration validation
 */

import { z } from "zod";

// =============================================================================
// Parser Options Schema
// =============================================================================

export const xmlParserOptionsSchema = z.object({
   preserveWhitespace: z.boolean().default(false),
   preserveComments: z.boolean().default(true),
   preserveProcessingInstructions: z.boolean().default(true),
   preserveCData: z.boolean().default(true),
});

// =============================================================================
// Serializer Options Schema
// =============================================================================

export const xmlSerializerOptionsSchema = z.object({
   declaration: z.boolean().default(true),
   indent: z.string().default("  "),
   newline: z.string().default("\n"),
   selfClose: z.boolean().default(true),
});

// =============================================================================
// C14N Options Schema
// =============================================================================

export const c14nOptionsSchema = z.object({
   exclusive: z.boolean().default(true),
   withComments: z.boolean().default(false),
   inclusiveNamespaces: z.array(z.string()).default([]),
});

// =============================================================================
// XPath Context Schema
// =============================================================================

export const xpathContextSchema = z.object({
   namespaces: z.record(z.string(), z.string()).default({}),
});
