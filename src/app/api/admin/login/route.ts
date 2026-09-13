import { NextResponse } from "next/server";
import {
  checkAdminPassword,
  isAllowedAdminEmail,
  setAdminSessionCookie,
} from "@/lib/admin";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  if (!isAllowedAdminEmail(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await setAdminSessionCookie(email);
  return NextResponse.json({ ok: true, email });
}
