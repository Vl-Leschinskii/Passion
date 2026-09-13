import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { basename, extname, join, resolve } from "path";
import { prisma } from "./prisma";
import { extractTextFromBuffer } from "./extract-text";
import { analyzeBookText } from "./analyze-book";

export const UPLOADS_DIR = resolve(process.cwd(), "uploads", "books");
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXT = new Set([".doc", ".docx", ".pdf"]);

export type UploadStatus = "pending" | "processing" | "done" | "error";

export type UploadMeta = {
  status: UploadStatus;
  bookId?: string;
  bookSlug?: string;
  titleRu?: string;
  error?: string | null;
  analyzedAt?: string | null;
};

export type UploadListItem = {
  name: string;
  size: number;
  mtime: string;
  status: UploadStatus;
  bookId?: string;
  bookSlug?: string;
  titleRu?: string;
  error?: string | null;
  analyzedAt?: string | null;
};

function ensureDir() {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function sanitizeUploadName(original: string): string {
  const base = basename(original).replace(/[^\w.\-()\s\u0400-\u04FF]+/g, "_").trim();
  const cleaned = base.replace(/\s+/g, " ");
  if (!cleaned || cleaned === "." || cleaned === "..") {
    throw new Error("Invalid file name");
  }
  const ext = extname(cleaned).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error("Only .doc, .docx, .pdf are allowed");
  }
  return cleaned;
}

function metaPath(fileName: string) {
  return join(UPLOADS_DIR, `${fileName}.meta.json`);
}

export function readMeta(fileName: string): UploadMeta {
  const p = metaPath(fileName);
  if (!existsSync(p)) return { status: "pending" };
  try {
    return JSON.parse(readFileSync(p, "utf8")) as UploadMeta;
  } catch {
    return { status: "pending" };
  }
}

export function writeMeta(fileName: string, meta: UploadMeta) {
  writeFileSync(metaPath(fileName), JSON.stringify(meta, null, 2), "utf8");
}

function resolveInsideUploads(fileName: string): string {
  const safe = basename(fileName);
  if (safe !== fileName || safe.includes("..")) {
    throw new Error("Invalid file name");
  }
  const full = resolve(UPLOADS_DIR, safe);
  if (!full.startsWith(UPLOADS_DIR + "/") && full !== UPLOADS_DIR) {
    throw new Error("Invalid path");
  }
  return full;
}

export function listUploads(): UploadListItem[] {
  ensureDir();
  const names = readdirSync(UPLOADS_DIR).filter((n) => !n.endsWith(".meta.json"));
  const items: UploadListItem[] = [];
  for (const name of names) {
    const full = join(UPLOADS_DIR, name);
    const st = statSync(full);
    if (!st.isFile()) continue;
    const meta = readMeta(name);
    items.push({
      name,
      size: st.size,
      mtime: st.mtime.toISOString(),
      status: meta.status,
      bookId: meta.bookId,
      bookSlug: meta.bookSlug,
      titleRu: meta.titleRu,
      error: meta.error ?? null,
      analyzedAt: meta.analyzedAt ?? null,
    });
  }
  return items.sort((a, b) => b.mtime.localeCompare(a.mtime));
}

export function saveUpload(originalName: string, data: Buffer): UploadListItem {
  ensureDir();
  if (data.length > MAX_BYTES) {
    throw new Error("File too large (max 20 MB)");
  }
  let name = sanitizeUploadName(originalName);
  let dest = join(UPLOADS_DIR, name);
  if (existsSync(dest)) {
    const ext = extname(name);
    const stem = name.slice(0, -ext.length);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    name = `${stem}-${stamp}${ext}`;
    dest = join(UPLOADS_DIR, name);
  }
  writeFileSync(dest, data);
  writeMeta(name, { status: "pending", error: null });
  const st = statSync(dest);
  return {
    name,
    size: st.size,
    mtime: st.mtime.toISOString(),
    status: "pending",
    error: null,
    analyzedAt: null,
  };
}

export function deleteUpload(fileName: string) {
  const full = resolveInsideUploads(fileName);
  if (!existsSync(full)) throw new Error("File not found");
  unlinkSync(full);
  const meta = metaPath(fileName);
  if (existsSync(meta)) unlinkSync(meta);
}

export async function analyzeUploadedBook(fileName: string) {
  const full = resolveInsideUploads(fileName);
  if (!existsSync(full)) {
    const err = new Error("File not found");
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  const meta = readMeta(fileName);
  if (meta.status === "done" && meta.bookId) {
    const err = new Error("Already analyzed");
    (err as Error & { status: number }).status = 409;
    throw err;
  }

  writeMeta(fileName, { ...meta, status: "processing", error: null });

  try {
    const buffer = readFileSync(full);
    const text = await extractTextFromBuffer(buffer, fileName);
    if (text.length < 500) {
      throw new Error("Extracted text is too short to analyze");
    }

    const analysis = await analyzeBookText(fileName, text);
    let slug = analysis.slug;
    const clash = await prisma.book.findUnique({ where: { slug } });
    if (clash) {
      const suffix = fileName.replace(/\W+/g, "").slice(0, 6).toLowerCase() || "upl";
      slug = `${slug}-${suffix}`;
    }

    const maxOrder = await prisma.book.aggregate({ _max: { sortOrder: true } });
    const book = await prisma.book.create({
      data: {
        slug,
        titleRu: analysis.titleRu,
        titleEn: analysis.titleEn,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        status: "published",
        heroes: {
          create: analysis.heroes.map((h, i) => ({
            sortOrder: i,
            nameRu: h.nameRu,
            nameEn: h.nameEn,
            subRu: h.subRu,
            subEn: h.subEn,
            group: h.group,
            descRu: h.descRu,
            descEn: h.descEn,
            scores: h.scores,
          })),
        },
      },
      include: { heroes: true },
    });

    const done: UploadMeta = {
      status: "done",
      bookId: book.id,
      bookSlug: book.slug,
      titleRu: book.titleRu,
      error: null,
      analyzedAt: new Date().toISOString(),
    };
    writeMeta(fileName, done);

    return {
      ok: true as const,
      book: {
        id: book.id,
        slug: book.slug,
        titleRu: book.titleRu,
        titleEn: book.titleEn,
        heroesCount: book.heroes.length,
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    writeMeta(fileName, {
      status: "error",
      error: message.slice(0, 1000),
      bookId: meta.bookId,
      bookSlug: meta.bookSlug,
      titleRu: meta.titleRu,
      analyzedAt: null,
    });
    throw e;
  }
}
