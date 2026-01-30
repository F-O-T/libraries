import type { MarkdownDocument, Node } from "@f-o-t/markdown";
import { parseToAst } from "@f-o-t/markdown";

export type MarkdownExtract = {
   text: string;
   headings: Array<{ level: number; text: string; index: number }>;
   links: Array<{ href: string; text: string }>;
   images: Array<{ alt: string; src: string }>;
   tables: number;
   paragraphs: string[];
};

export function extractFromMarkdown(content: string): MarkdownExtract {
   const ast = parseToAst(content) as MarkdownDocument;
   const headings: MarkdownExtract["headings"] = [];
   const links: MarkdownExtract["links"] = [];
   const images: MarkdownExtract["images"] = [];
   const paragraphs: string[] = [];
   let tables = 0;

   const textParts: string[] = [];
   let index = 0;

   const walk = (node: Node): void => {
      switch (node.type) {
         case "heading": {
            const text = collectText(node);
            headings.push({ level: node.level, text, index });
            textParts.push(text);
            index += 1;
            break;
         }
         case "paragraph": {
            const text = collectText(node);
            if (text.trim().length > 0) {
               paragraphs.push(text);
               textParts.push(text);
            }
            break;
         }
         case "link": {
            const text = collectText(node);
            links.push({ href: node.url, text });
            break;
         }
         case "image": {
            images.push({ alt: node.alt ?? "", src: node.url });
            break;
         }
         case "codeBlock": {
            return;
         }
         case "codeSpan": {
            return;
         }
         case "table": {
            tables += 1;
            break;
         }
         default:
            break;
      }

      if ("children" in node && Array.isArray(node.children)) {
         for (const child of node.children) walk(child);
      }
   };

   for (const node of ast.children) {
      walk(node);
   }

   return {
      text: textParts.join("\n\n"),
      headings,
      links,
      images,
      tables,
      paragraphs,
   };
}

function collectText(node: Node): string {
   const parts: string[] = [];
   const walk = (current: Node): void => {
      if (current.type === "text") {
         parts.push(current.value);
      }
      if (current.type === "codeSpan") {
         return;
      }
      if ("children" in current && Array.isArray(current.children)) {
         for (const child of current.children) walk(child);
      }
   };
   walk(node);
   return parts.join("");
}
