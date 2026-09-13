import { NextResponse } from "next/server";
import { requireAdminEmail } from "@/lib/admin";

export async function GET() {
  const email = await requireAdminEmail();
  if (!email) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, email });
}
