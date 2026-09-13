import { NextResponse } from "next/server";
import { requireAdminEmail } from "@/lib/admin";
import { deleteUpload, listUploads, saveUpload } from "@/lib/uploads";

export async function GET() {
  const email = await requireAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ files: listUploads() });
}

export async function POST(req: Request) {
  const email = await requireAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const saved = saveUpload(file.name || "book.bin", buf);
    return NextResponse.json({ ok: true, file: saved });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const email = await requireAdminEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const name = new URL(req.url).searchParams.get("name");
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  try {
    deleteUpload(name);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = message === "File not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
