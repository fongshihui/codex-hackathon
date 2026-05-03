import { parentPort, workerData } from "node:worker_threads";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";

async function extractPdf(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text || result.pages?.map((page) => page.text).join("\n\n") || "";
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

async function extractDoc(buffer) {
  const extractor = new WordExtractor();
  const document = await extractor.extract(buffer);
  return document.getBody() || "";
}

async function extract() {
  const extension = String(workerData.extension || "").toLowerCase();
  const mimeType = String(workerData.mimeType || "").toLowerCase();
  const buffer = Buffer.from(workerData.buffer);

  if (extension === "pdf" || mimeType === "application/pdf") {
    return extractPdf(buffer);
  }
  if (
    extension === "docx" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocx(buffer);
  }
  if (extension === "doc" || mimeType === "application/msword") {
    return extractDoc(buffer);
  }

  const error = new Error("Unsupported document type.");
  error.status = 400;
  throw error;
}

try {
  const text = await extract();
  parentPort.postMessage({ text });
} catch (error) {
  parentPort.postMessage({
    error: error.message || "Resume extraction failed.",
    status: error.status || 500,
  });
}
