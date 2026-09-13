import { readFileSync, existsSync } from "fs";
import { google } from "googleapis";
import type { JWTInput } from "google-auth-library";
import { SEED_BOOKS } from "@/data/seed-books";

export type DriveListedFile = {
  id: string;
  name: string;
  mimeType?: string | null;
  modifiedTime?: string | null;
};

type ServiceAccountCreds = {
  client_email: string;
  private_key: string;
};

function loadServiceAccount(): ServiceAccountCreds {
  const jsonPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH ||
    "";
  if (jsonPath && existsSync(jsonPath)) {
    const raw = JSON.parse(readFileSync(jsonPath, "utf8")) as JWTInput & {
      client_email?: string;
      private_key?: string;
    };
    if (!raw.client_email || !raw.private_key) {
      throw new Error(`Invalid service account JSON at ${jsonPath}`);
    }
    return { client_email: raw.client_email, private_key: raw.private_key };
  }

  const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inlineJson) {
    const raw = JSON.parse(inlineJson) as { client_email?: string; private_key?: string };
    if (!raw.client_email || !raw.private_key) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email/private_key");
    }
    return { client_email: raw.client_email, private_key: raw.private_key };
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (email && key) {
    return { client_email: email, private_key: key };
  }

  throw new Error(
    "Google Drive is not configured. Put the service-account JSON at secrets/google-sa.json " +
      "or set GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
  );
}

function getAuth() {
  const creds = loadServiceAccount();
  return new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
}

export function getDriveAuth() {
  return getAuth();
}

export function isDriveConfigured() {
  try {
    if (!process.env.GOOGLE_DRIVE_FOLDER_ID) return false;
    loadServiceAccount();
    return true;
  } catch {
    return false;
  }
}

export function getDriveServiceAccountEmail(): string | null {
  try {
    return loadServiceAccount().client_email;
  } catch {
    return null;
  }
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
