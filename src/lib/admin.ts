import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "passion_admin";
const SESSION_DAYS = 14;

function cookieSecure() {
  return process.env.COOKIE_SECURE === "true";
}

export function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "vleschinskii@gmail.com";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdminEmail(email: string): boolean {
  return adminEmails().includes(email.trim().toLowerCase());
}

function signingSecret(): string {
  const secret = process.env.ADMIN_TOKEN;
  if (!secret) throw new Error("ADMIN_TOKEN is not configured");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Cookie value: email|exp|sig */
export function createAdminSessionToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${normalized}|${exp}`;
  return `${payload}|${sign(payload)}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split("|");
  if (parts.length !== 3) return null;
  const [email, expRaw, sig] = parts;
  const payload = `${email}|${expRaw}`;
  try {
    if (!safeEqual(sign(payload), sig)) return null;
  } catch {
    return null;
  }
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  if (!isAllowedAdminEmail(email)) return null;
  return email;
}

export async function getAdminEmailFromCookie(): Promise<string | null> {
  const jar = await cookies();
  return verifyAdminSessionToken(jar.get(ADMIN_COOKIE)?.value);
}

export async function requireAdminEmail(): Promise<string | null> {
  return getAdminEmailFromCookie();
}

export async function setAdminSessionCookie(email: string) {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, createAdminSessionToken(email), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    secure: cookieSecure(),
  });
}

export async function clearAdminSessionCookie() {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: cookieSecure(),
  });
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_TOKEN || "";
  if (!expected || !password) return false;
  // Fixed-length digest so unequal string lengths stay constant-time.
  const a = createHmac("sha256", "passion-admin-pw").update(password).digest();
  const b = createHmac("sha256", "passion-admin-pw").update(expected).digest();
  return timingSafeEqual(a, b);
}
