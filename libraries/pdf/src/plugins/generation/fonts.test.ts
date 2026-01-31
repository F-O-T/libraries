import { describe, expect, test } from "bun:test";
import {
   STANDARD_FONTS,
   FONT_FAMILIES,
   isStandardFont,
   getFontRefName,
} from "./fonts.ts";

describe("Standard Fonts", () => {
   test("has 14 standard fonts", () => {
      expect(Object.keys(STANDARD_FONTS).length).toBe(14);
   });

   test("isStandardFont recognizes standard fonts", () => {
      expect(isStandardFont("Helvetica")).toBe(true);
      expect(isStandardFont("Times-Roman")).toBe(true);
      expect(isStandardFont("Invalid-Font")).toBe(false);
   });

   test("getFontRefName returns unique names", () => {
      const name1 = getFontRefName("Helvetica");
      const name2 = getFontRefName("Times-Roman");
      expect(name1).toBe("F5");
      expect(name2).not.toBe(name1);
   });

   test("font families are properly typed", () => {
      expect(FONT_FAMILIES.helvetica.regular).toBe("Helvetica");
      expect(FONT_FAMILIES.times.bold).toBe("Times-Bold");
      expect(FONT_FAMILIES.courier.oblique).toBe("Courier-Oblique");
   });
});
