import { NextResponse } from "next/server";
import { requireAdminEmail } from "@/lib/admin";
import { analyzeUploadedBook } from "@/lib/uploads";

export const maxDuration = 300;

export async function POST(req: Request) {
  const email = await requireAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  try {
    const result = await analyzeUploadedBook(name);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = (e as Error & { status?: number }).status || 500;
    return NextResponse.json({ error: message }, { status });
  }
}
