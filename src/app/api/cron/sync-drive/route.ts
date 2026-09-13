import { NextResponse } from "next/server";
import { syncDriveBooks } from "@/lib/sync-drive";

function authorized(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return Boolean(process.env.CRON_SECRET) && token === process.env.CRON_SECRET;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncDriveBooks();
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  return GET(req);
}
