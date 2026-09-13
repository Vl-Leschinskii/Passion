import { NextResponse } from "next/server";
import { syncDriveBooks } from "@/lib/sync-drive";

export async function POST(req: Request) {
  const token = req.headers.get("x-admin-token") || "";
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncDriveBooks();
  return NextResponse.json(result);
}
