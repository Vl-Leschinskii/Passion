import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRespondentIdFromCookie } from "@/lib/respondent";
import {
  bookSetHash,
  heroKey,
  isFullBfi,
  payloadFromAnswers,
  type GumilevGroup,
} from "@/lib/quiz";

const HeroAnswerSchema = z.object({
  bookSlug: z.string().min(1),
  heroId: z.string().min(1),
  guess: z.enum(["passi", "garm", "sub"]),
  bfi: z.object({
    O: z.boolean(),
    C: z.boolean(),
    E: z.boolean(),
    A: z.boolean(),
    N: z.boolean(),
  }),
});

async function publishedHeroes() {
  return prisma.hero.findMany({
    where: { book: { status: "published" } },
    include: { book: { select: { slug: true } } },
  });
}

export async function GET() {
  const respondentId = await getRespondentIdFromCookie();
  if (!respondentId) {
    return NextResponse.json({ error: "Missing respondent cookie" }, { status: 401 });
  }

  const answers = await prisma.heroAnswer.findMany({
    where: { respondentId },
    orderBy: { updatedAt: "asc" },
  });

  return NextResponse.json({
    answers: answers.map((a) => ({
      bookSlug: a.bookSlug,
      heroId: a.heroId,
      guess: a.guess as GumilevGroup,
      bfi: a.bfi,
    })),
    payload: payloadFromAnswers(answers),
  });
}

export async function POST(req: Request) {
  const respondentId = await getRespondentIdFromCookie();
  if (!respondentId) {
    return NextResponse.json({ error: "Missing respondent cookie" }, { status: 401 });
  }

  const respondent = await prisma.respondent.findUnique({ where: { id: respondentId } });
  if (!respondent) {
    return NextResponse.json({ error: "Unknown respondent" }, { status: 401 });
  }
  if (respondent.completedAt) {
    return NextResponse.json({ error: "Already completed" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const parsed = HeroAnswerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid hero answer", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { bookSlug, heroId, guess, bfi } = parsed.data;
  if (!isFullBfi(bfi)) {
    return NextResponse.json({ error: "Incomplete BFI answers" }, { status: 400 });
  }

  const hero = await prisma.hero.findFirst({
    where: {
      id: heroId,
      book: { slug: bookSlug, status: "published" },
    },
  });
  if (!hero) {
    return NextResponse.json({ error: "Hero not found" }, { status: 404 });
  }

  await prisma.heroAnswer.upsert({
    where: {
      respondentId_heroId: { respondentId, heroId },
    },
    create: {
      respondentId,
      heroId,
      bookSlug,
      guess,
      bfi,
    },
    update: {
      bookSlug,
      guess,
      bfi,
    },
  });

  const heroes = await publishedHeroes();
  const answers = await prisma.heroAnswer.findMany({ where: { respondentId } });
  const answeredIds = new Set(answers.map((a) => a.heroId));
  const allDone =
    heroes.length > 0 && heroes.every((h) => answeredIds.has(h.id));

  const payload = payloadFromAnswers(answers);
  const hash = bookSetHash(heroes);

  if (allDone) {
    await prisma.$transaction([
      prisma.response.upsert({
        where: { respondentId },
        create: {
          respondentId,
          payload,
          bookSetHash: hash,
        },
        update: {
          payload,
          bookSetHash: hash,
        },
      }),
      prisma.respondent.update({
        where: { id: respondentId },
        data: { completedAt: new Date() },
      }),
    ]);
  } else {
    // Keep a rolling snapshot of whatever is answered so far
    await prisma.response.upsert({
      where: { respondentId },
      create: {
        respondentId,
        payload,
        bookSetHash: hash,
      },
      update: {
        payload,
        bookSetHash: hash,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    savedKey: heroKey(bookSlug, heroId),
    answeredCount: answers.length,
    totalHeroes: heroes.length,
    completed: allDone,
  });
}
