import axios from "axios";
import pdf from "pdf-parse";
import { createCanvas } from "canvas";
import Tesseract from "tesseract.js";

// Import backend-friendly PDF.js
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

export async function extractPDFText(fileUrl) {
  try {
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const buffer = response.data;

    // Try normal PDF text extraction
    const parsed = await pdf(buffer);
    if (parsed.text && parsed.text.trim().length > 20) {
      console.log("✔ Extracted text using pdf-parse");
      return parsed.text;
    }

    console.log("⚠ No text detected. Switching to OCR...");

    const pages = await convertPDFToImages(buffer);
    let finalText = "";

    for (const img of pages) {
      const { data } = await Tesseract.recognize(img, "eng");
      finalText += data.text + "\n";
    }

    return finalText.trim();

  } catch (err) {
    console.error("PDF Extraction Error:", err);
    return "";
  }
}

async function convertPDFToImages(buffer) {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;

  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");

    const renderContext = {
      canvasContext: ctx,
      viewport
    };

    await page.render(renderContext).promise;
    pages.push(canvas.toBuffer("image/png"));
  }

  return pages;
}
