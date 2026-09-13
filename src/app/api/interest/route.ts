import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRespondentIdFromCookie } from "@/lib/respondent";

const BodySchema = z.object({
  email: z.string().email().max(200),
});

export async function POST(req: Request) {
  const respondentId = await getRespondentIdFromCookie();
  if (!respondentId) {
    return NextResponse.json({ error: "Missing respondent cookie" }, { status: 401 });
  }

  const respondent = await prisma.respondent.findUnique({ where: { id: respondentId } });
  if (!respondent?.completedAt) {
    return NextResponse.json({ error: "Complete the quiz first" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  await prisma.interest.create({
    data: {
      respondentId,
      email: parsed.data.email.trim().toLowerCase(),
    },
  });

  return NextResponse.json({ ok: true });
}
