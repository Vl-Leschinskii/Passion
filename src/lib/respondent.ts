import { cookies } from "next/headers";
import { v4 as uuidv4, validate as uuidValidate } from "uuid";
import { prisma } from "./prisma";

export const RESPONDENT_COOKIE = "passion_rid";
const ONE_YEAR = 60 * 60 * 24 * 365;

function cookieSecure() {
  // HTTP production (http://IP/...) cannot use Secure cookies — browsers drop them.
  return process.env.COOKIE_SECURE === "true";
}

export async function getOrCreateRespondentId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(RESPONDENT_COOKIE)?.value;
  if (existing && uuidValidate(existing)) {
    const found = await prisma.respondent.findUnique({ where: { id: existing } });
    if (found) return existing;
  }

  const id = uuidv4();
  await prisma.respondent.create({ data: { id } });
  jar.set(RESPONDENT_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
    secure: cookieSecure(),
  });
  return id;
}

export async function getRespondentIdFromCookie(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(RESPONDENT_COOKIE)?.value ?? null;
  if (!value || !uuidValidate(value)) return null;
  return value;
}
