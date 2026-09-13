import mammoth from "mammoth";
import WordExtractor from "word-extractor";

export async function extractTextFromBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType?: string | null,
): Promise<string> {
  const lower = fileName.toLowerCase();
  const mime = mimeType ?? "";

  if (lower.endsWith(".docx") || mime.includes("wordprocessingml")) {
    const result = await mammoth.extractRawText({ buffer });
    return cleanText(result.value);
  }

  if (lower.endsWith(".doc") || mime.includes("msword")) {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(buffer);
    return cleanText(doc.getBody());
  }

  if (lower.endsWith(".pdf") || mime.includes("pdf")) {
    // pdf-parse@1.x default export
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (data: Buffer) => Promise<{ text: string }>;
    const parsed = await pdfParse(buffer);
    return cleanText(parsed.text);
  }

  // Google Docs export is handled upstream as plain text / docx
  return cleanText(buffer.toString("utf8"));
}

function cleanText(text: string) {
  return text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

/** Keep enough context for character analysis without blowing the LLM window. */
export function sampleBookText(text: string, maxChars = 120_000) {
  if (text.length <= maxChars) return text;
  const head = text.slice(0, Math.floor(maxChars * 0.55));
  const midStart = Math.floor(text.length / 2 - maxChars * 0.15);
  const mid = text.slice(Math.max(0, midStart), midStart + Math.floor(maxChars * 0.2));
  const tail = text.slice(text.length - Math.floor(maxChars * 0.25));
  return `${head}\n\n[...]\n\n${mid}\n\n[...]\n\n${tail}`;
}
