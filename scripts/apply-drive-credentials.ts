#!/usr/bin/env tsx
/**
 * Apply a Google service-account JSON into local config.
 *
 * Usage:
 *   npx tsx scripts/apply-drive-credentials.ts /path/to/sa.json
 *
 * Writes secrets/google-sa.json and sets GOOGLE_APPLICATION_CREDENTIALS in .env
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "..");
const secretsDir = resolve(root, "secrets");
const targetJson = resolve(secretsDir, "google-sa.json");
const envPath = resolve(root, ".env");

const src = process.argv[2];
if (!src) {
  console.error("Usage: npx tsx scripts/apply-drive-credentials.ts /path/to/service-account.json");
  process.exit(1);
}
if (!existsSync(src)) {
  console.error(`File not found: ${src}`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(src, "utf8")) as {
  type?: string;
  client_email?: string;
  private_key?: string;
};
if (raw.type !== "service_account" || !raw.client_email || !raw.private_key) {
  console.error("Not a valid Google service_account JSON (need type, client_email, private_key).");
  process.exit(1);
}

mkdirSync(secretsDir, { recursive: true });
copyFileSync(src, targetJson);

let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const set = (key: string, value: string) => {
  const line = `${key}="${value}"`;
  if (new RegExp(`^${key}=`, "m").test(env)) {
    env = env.replace(new RegExp(`^${key}=.*$`, "m"), line);
  } else {
    env = env.trimEnd() + `\n${line}\n`;
  }
};

set("GOOGLE_APPLICATION_CREDENTIALS", targetJson);
set("GOOGLE_SERVICE_ACCOUNT_EMAIL", raw.client_email);
// Keep private key out of .env when JSON file is used
set("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "");
if (!/^GOOGLE_DRIVE_FOLDER_ID=/m.test(env)) {
  set("GOOGLE_DRIVE_FOLDER_ID", "1TGz0X3YM1D15mATN1Iwh-BywJA4WVYWj");
}

writeFileSync(envPath, env.endsWith("\n") ? env : env + "\n");

console.log("OK");
console.log(`  JSON:  ${targetJson}`);
console.log(`  email: ${raw.client_email}`);
console.log("");
console.log("Next steps:");
console.log(`  1. Share Drive folder with: ${raw.client_email} (Viewer)`);
console.log("  2. Put OPENAI_API_KEY in .env (needed to analyse new books)");
console.log("  3. Restart Next, then: npm run sync:drive");
