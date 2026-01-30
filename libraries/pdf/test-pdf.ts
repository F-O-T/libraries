import { PDFDocument } from "./src/generation/document.ts";
import { writeFileSync } from "fs";

const doc = new PDFDocument();
const page = doc.addPage();

page.drawText("Hello from @f-o-t/pdf!", { x: 100, y: 750, size: 24 });
page.drawRectangle({
   x: 100,
   y: 650,
   width: 400,
   height: 100,
   fill: { type: "rgb", r: 0.9, g: 0.9, b: 1 },
   stroke: { type: "rgb", r: 0, g: 0, b: 1 },
   lineWidth: 2,
});

const bytes = doc.save();
writeFileSync("test-output.pdf", bytes);
console.log("PDF created: test-output.pdf");
