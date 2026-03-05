import { PDFReader } from "@f-o-t/pdf";
import type { DetectedPosition, DetectPositionOptions } from "./types.ts";

const KEYWORD_PATTERNS = [
   "assinatura",
   "assine",
   "representante",
   "responsável",
   "responsavel",
   "signatário",
   "signatario",
];

const LINE_PATTERN = /_{5,}|-{5,}/;

type Signal = {
   page: number;
   weight: number;
   position: number; // 0=top, 1=bottom as fraction of page
};

/**
 * Detect the best position to place a digital signature on a PDF.
 *
 * Uses weighted scoring across three signal types:
 * - Signer name match (weight 3)
 * - Horizontal line patterns (weight 2)
 * - Signature keywords (weight 1)
 *
 * Returns null if the PDF cannot be parsed.
 */
export function detectSigningPosition(
   pdfData: Uint8Array,
   options: DetectPositionOptions = {},
): DetectedPosition | null {
   let pages;
   try {
      const reader = new PDFReader(pdfData);
      const parsed = reader.parse();
      pages = parsed.pages;
   } catch {
      return null;
   }

   if (pages.length === 0) return null;

   const signals: Signal[] = [];
   const preferredPage =
      options.preferredPage === -1
         ? pages.length - 1
         : (options.preferredPage ?? pages.length - 1);

   // Only scan the last few pages for signals — signatures are
   // almost always near the end, and scanning every page of a
   // large document is expensive (causes browser freezes).
   const scanStart = Math.max(0, pages.length - 3);
   for (let i = scanStart; i < pages.length; i++) {
      const page = pages[i]!;
      const text = page.content.toLowerCase();

      // Signal 1: Signer name (weight 3)
      if (options.signerName) {
         const name = options.signerName.toLowerCase();
         if (text.includes(name)) {
            const idx = text.indexOf(name);
            const position = text.length > 0 ? idx / text.length : 0.5;
            signals.push({ page: i, weight: 3, position });
         }
      }

      // Signal 1b: Organization name (weight 2.5)
      if (options.organization) {
         const org = options.organization.toLowerCase();
         if (text.includes(org)) {
            const idx = text.indexOf(org);
            const position = text.length > 0 ? idx / text.length : 0.5;
            signals.push({ page: i, weight: 2.5, position });
         }
      }

      // Signal 2: Line patterns (weight 2)
      if (LINE_PATTERN.test(text)) {
         const idx = text.search(LINE_PATTERN);
         const position = text.length > 0 ? idx / text.length : 0.5;
         signals.push({ page: i, weight: 2, position });
      }

      // Signal 3: Keywords (weight 1)
      for (const keyword of KEYWORD_PATTERNS) {
         if (text.includes(keyword)) {
            const idx = text.indexOf(keyword);
            const position = text.length > 0 ? idx / text.length : 0.5;
            signals.push({ page: i, weight: 1, position });
            break;
         }
      }
   }

   // No signals: fallback to bottom of last page
   if (signals.length === 0) {
      const lastPage = pages[pages.length - 1]!;
      return {
         page: pages.length - 1,
         x: 50,
         y: lastPage.size.height - 150,
         confidence: 0.1,
      };
   }

   // Group signals by page
   const pageScores = new Map<
      number,
      { totalWeight: number; bestPosition: number; bestWeight: number }
   >();
   for (const signal of signals) {
      const existing = pageScores.get(signal.page);
      if (existing) {
         existing.totalWeight += signal.weight;
         if (signal.weight > existing.bestWeight) {
            existing.bestWeight = signal.weight;
            existing.bestPosition = signal.position;
         }
      } else {
         pageScores.set(signal.page, {
            totalWeight: signal.weight,
            bestPosition: signal.position,
            bestWeight: signal.weight,
         });
      }
   }

   // Boost preferred page
   const preferredScore = pageScores.get(preferredPage);
   if (preferredScore) {
      preferredScore.totalWeight *= 1.2;
   }

   // Pick best page
   let bestPage = preferredPage;
   let bestScore = 0;
   for (const [page, score] of pageScores) {
      if (score.totalWeight > bestScore) {
         bestScore = score.totalWeight;
         bestPage = page;
      }
   }

   const pageInfo = pages[bestPage]!;
   const pageScore = pageScores.get(bestPage)!;

   // Position above the best match
   const yFraction = pageScore.bestPosition;
   const sigHeight = options.height ?? 120;
   const yFromTop = Math.max(
      10,
      yFraction * pageInfo.size.height - sigHeight - 20,
   );

   const maxWeight = 3 + 2.5 + 2 + 1;
   const confidence = Math.min(1, bestScore / maxWeight);

   return {
      page: bestPage,
      x: options.width ? (pageInfo.size.width - options.width) / 2 : 50,
      y: yFromTop,
      confidence,
   };
}
