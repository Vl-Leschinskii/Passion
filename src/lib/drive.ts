import { google } from "googleapis";
import { SEED_BOOKS } from "@/data/seed-books";

export type DriveListedFile = {
  id: string;
  name: string;
  mimeType?: string | null;
  modifiedTime?: string | null;
};

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) {
    throw new Error(
      "Google Drive is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
}

export function isDriveConfigured() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      process.env.GOOGLE_DRIVE_FOLDER_ID,
  );
}

export async function listDriveFolderFiles(): Promise<DriveListedFile[]> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID is not set");

  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });
  const files: DriveListedFile[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime)",
      pageSize: 100,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    for (const f of res.data.files ?? []) {
      if (f.id && f.name) {
        files.push({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          modifiedTime: f.modifiedTime,
        });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return files;
}

export async function downloadDriveFile(fileId: string): Promise<Buffer> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" },
  );
  return Buffer.from(res.data as ArrayBuffer);
}

export function matchSeedBook(fileName: string) {
  const lower = fileName.toLowerCase();
  return SEED_BOOKS.find((b) => b.driveNameHints.some((h) => lower.includes(h)));
}

export function isSupportedBookFile(name: string, mimeType?: string | null) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".doc") || lower.endsWith(".docx") || lower.endsWith(".pdf")) {
    return true;
  }
  const mime = mimeType ?? "";
  return (
    mime.includes("msword") ||
    mime.includes("wordprocessingml") ||
    mime.includes("pdf") ||
    mime === "application/vnd.google-apps.document"
  );
}
