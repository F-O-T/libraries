import { describe, expect, it } from "bun:test";
import { analyzeKeywords } from "../src/keywords";

describe("analyzeKeywords", () => {
   it("should return top terms and bigrams", () => {
      const result = analyzeKeywords({
         content: "SEO tools help SEO teams measure SEO impact.",
         targetKeywords: ["SEO"],
      });

      expect(result.topKeywords.length).toBeGreaterThan(0);
      expect(result.topPhrases?.length ?? 0).toBeGreaterThan(0);
   });
});
