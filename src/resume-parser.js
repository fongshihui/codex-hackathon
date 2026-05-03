import { Worker } from "node:worker_threads";

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

  if (
    extension === "pdf" ||
    mimeType === "application/pdf" ||
    extension === "docx" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "doc" ||
    mimeType === "application/msword"
  ) {
    text = await extractDocumentInWorker({ buffer: file.buffer, extension, mimeType });
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

function extractDocumentInWorker({ buffer, extension, mimeType }) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./resume-worker.js", import.meta.url), {
      workerData: {
        buffer,
        extension,
        mimeType,
      },
    });
    const timeoutMs = Number(process.env.RESUME_WORKER_TIMEOUT_MS || 30_000);
    const timer = setTimeout(() => {
      worker.terminate();
      const error = new Error("Resume extraction timed out.");
      error.status = 504;
      reject(error);
    }, timeoutMs);

    worker.once("message", (message) => {
      clearTimeout(timer);
      if (message?.error) {
        const error = new Error(message.error);
        error.status = message.status || 500;
        reject(error);
        return;
      }
      resolve(message?.text || "");
    });
    worker.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    worker.once("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Resume extraction worker exited with code ${code}.`));
      }
    });
  });
}

function cleanExtractedText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}
