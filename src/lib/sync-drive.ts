import { prisma } from "./prisma";
import {
  downloadDriveFile,
  isDriveConfigured,
  isSupportedBookFile,
  listDriveFolderFiles,
  matchSeedBook,
} from "./drive";
import { extractTextFromBuffer } from "./extract-text";
import { analyzeBookText } from "./analyze-book";
import { google } from "googleapis";

export type SyncResult = {
  configured: boolean;
  listed: number;
  created: number;
  skippedSeed: number;
  analyzed: number;
  errors: Array<{ file: string; error: string }>;
};

async function exportGoogleDocAsDocx(fileId: string): Promise<Buffer> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.export(
    {
      fileId,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    { responseType: "arraybuffer" },
  );
  return Buffer.from(res.data as ArrayBuffer);
}

export async function syncDriveBooks(): Promise<SyncResult> {
  if (!isDriveConfigured()) {
    return {
      configured: false,
      listed: 0,
      created: 0,
      skippedSeed: 0,
      analyzed: 0,
      errors: [{ file: "-", error: "Drive credentials not configured" }],
    };
  }

  const files = await listDriveFolderFiles();
  const result: SyncResult = {
    configured: true,
    listed: files.length,
    created: 0,
    skippedSeed: 0,
    analyzed: 0,
    errors: [],
  };

  for (const file of files) {
    if (!isSupportedBookFile(file.name, file.mimeType)) continue;

    let record = await prisma.driveFile.findUnique({ where: { fileId: file.id } });
    if (!record) {
      record = await prisma.driveFile.create({
        data: {
          fileId: file.id,
          name: file.name,
          mimeType: file.mimeType ?? undefined,
          modifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : undefined,
          status: "seen",
        },
      });
      result.created += 1;
    } else {
      await prisma.driveFile.update({
        where: { id: record.id },
        data: {
          name: file.name,
          mimeType: file.mimeType ?? undefined,
          modifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : undefined,
        },
      });
    }

    if (record.status === "done" || record.status === "skipped") continue;

    const seed = matchSeedBook(file.name);
    if (seed) {
      const book = await prisma.book.findUnique({ where: { slug: seed.slug } });
      await prisma.driveFile.update({
        where: { id: record.id },
        data: {
          status: "skipped",
          bookId: book?.id,
          syncedAt: new Date(),
          error: null,
        },
      });
      result.skippedSeed += 1;
      continue;
    }

    try {
      await prisma.driveFile.update({
        where: { id: record.id },
        data: { status: "processing", error: null },
      });

      const buffer =
        file.mimeType === "application/vnd.google-apps.document"
          ? await exportGoogleDocAsDocx(file.id)
          : await downloadDriveFile(file.id);

      const text = await extractTextFromBuffer(
        buffer,
        file.name,
        file.mimeType === "application/vnd.google-apps.document"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : file.mimeType,
      );

      if (text.length < 500) {
        throw new Error("Extracted text is too short to analyze");
      }

      const analysis = await analyzeBookText(file.name, text);
      let slug = analysis.slug;
      const clash = await prisma.book.findUnique({ where: { slug } });
      if (clash) slug = `${slug}-${file.id.slice(0, 6).toLowerCase()}`;

      const maxOrder = await prisma.book.aggregate({ _max: { sortOrder: true } });
      const book = await prisma.book.create({
        data: {
          slug,
          titleRu: analysis.titleRu,
          titleEn: analysis.titleEn,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
          status: "published",
          sourceDriveFileId: file.id,
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
      });

      await prisma.driveFile.update({
        where: { id: record.id },
        data: {
          status: "done",
          bookId: book.id,
          syncedAt: new Date(),
          error: null,
        },
      });
      result.analyzed += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await prisma.driveFile.update({
        where: { id: record.id },
        data: { status: "error", error: message.slice(0, 1000) },
      });
      result.errors.push({ file: file.name, error: message });
    }
  }

  return result;
}
