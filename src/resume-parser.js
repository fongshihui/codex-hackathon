import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";

const textExtensions = new Set(["txt", "md", "csv", "rtf"]);
const maxExtractedLength = 20_000;

export async function extractResumeText(file) {
  if (!file?.buffer?.length) {
    const error = new Error("Upload a resume file.");
    error.status = 400;
    throw error;
  }

  const extension = fileExtension(file.originalname);
  const mimeType = String(file.mimetype || "").toLowerCase();
  let text = "";

  if (extension === "pdf" || mimeType === "application/pdf") {
    text = await extractPdf(file.buffer);
  } else if (
    extension === "docx" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    text = await extractDocx(file.buffer);
  } else if (extension === "doc" || mimeType === "application/msword") {
    text = await extractDoc(file.buffer);
  } else if (textExtensions.has(extension) || mimeType.startsWith("text/")) {
    text = file.buffer.toString("utf8");
  } else {
    const error = new Error("Upload a PDF, DOC, DOCX, TXT, MD, CSV, or RTF resume.");
    error.status = 400;
    throw error;
  }

  const cleaned = cleanExtractedText(text);
  if (!cleaned) {
    const error = new Error("Could not extract readable text from that resume.");
    error.status = 422;
    throw error;
  }

  return {
    text: cleaned.slice(0, maxExtractedLength),
    truncated: cleaned.length > maxExtractedLength,
    filename: file.originalname,
    type: extension || mimeType || "unknown",
  };
}

function fileExtension(filename = "") {
  return String(filename).split(".").pop()?.toLowerCase() || "";
}

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

function cleanExtractedText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}
