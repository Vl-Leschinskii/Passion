import { NextResponse } from "next/server";
import { requireAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type Bfi = { O?: boolean; C?: boolean; E?: boolean; A?: boolean; N?: boolean };

export async function GET() {
  const email = await requireAdminEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    respondentsTotal,
    respondentsCompleted,
    answersTotal,
    interestsTotal,
    books,
    answers,
    recentAnswers,
    dailyRaw,
    interests,
  ] = await Promise.all([
    prisma.respondent.count(),
    prisma.respondent.count({ where: { completedAt: { not: null } } }),
    prisma.heroAnswer.count(),
    prisma.interest.count(),
    prisma.book.findMany({
      where: { status: "published" },
      orderBy: { sortOrder: "asc" },
      include: { heroes: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.heroAnswer.findMany({
      select: {
        heroId: true,
        bookSlug: true,
        guess: true,
        bfi: true,
        createdAt: true,
      },
    }),
    prisma.heroAnswer.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        respondentId: true,
        heroId: true,
        bookSlug: true,
        guess: true,
        bfi: true,
        createdAt: true,
      },
    }),
    prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
      FROM "HeroAnswer"
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 30
    `,
    prisma.interest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        respondent: {
          select: {
            id: true,
            createdAt: true,
            completedAt: true,
            locale: true,
            _count: { select: { answers: true } },
          },
        },
      },
    }),
  ]);

  const heroMeta = new Map<string, { nameRu: string; nameEn: string; bookTitleRu: string; bookSlug: string }>();
  for (const book of books) {
    for (const hero of book.heroes) {
      heroMeta.set(hero.id, {
        nameRu: hero.nameRu,
        nameEn: hero.nameEn,
        bookTitleRu: book.titleRu,
        bookSlug: book.slug,
      });
    }
  }

  const guessTotals: Record<string, number> = { passi: 0, garm: 0, sub: 0 };
  const bfiYes: Record<string, { yes: number; total: number }> = {
    O: { yes: 0, total: 0 },
    C: { yes: 0, total: 0 },
    E: { yes: 0, total: 0 },
    A: { yes: 0, total: 0 },
    N: { yes: 0, total: 0 },
  };

  const byBook = new Map<
    string,
    { bookSlug: string; titleRu: string; answers: number; guesses: Record<string, number> }
  >();
  for (const book of books) {
    byBook.set(book.slug, {
      bookSlug: book.slug,
      titleRu: book.titleRu,
      answers: 0,
      guesses: { passi: 0, garm: 0, sub: 0 },
    });
  }

  const byHero = new Map<
    string,
    {
      heroId: string;
      nameRu: string;
      bookSlug: string;
      bookTitleRu: string;
      answers: number;
      guesses: Record<string, number>;
    }
  >();

  for (const a of answers) {
    if (a.guess in guessTotals) guessTotals[a.guess] += 1;
    const bookRow = byBook.get(a.bookSlug);
    if (bookRow) {
      bookRow.answers += 1;
      if (a.guess in bookRow.guesses) bookRow.guesses[a.guess] += 1;
    }

    const meta = heroMeta.get(a.heroId);
    let heroRow = byHero.get(a.heroId);
    if (!heroRow) {
      heroRow = {
        heroId: a.heroId,
        nameRu: meta?.nameRu || a.heroId,
        bookSlug: a.bookSlug,
        bookTitleRu: meta?.bookTitleRu || a.bookSlug,
        answers: 0,
        guesses: { passi: 0, garm: 0, sub: 0 },
      };
      byHero.set(a.heroId, heroRow);
    }
    heroRow.answers += 1;
    if (a.guess in heroRow.guesses) heroRow.guesses[a.guess] += 1;

    const bfi = (a.bfi || {}) as Bfi;
    for (const k of ["O", "C", "E", "A", "N"] as const) {
      if (typeof bfi[k] === "boolean") {
        bfiYes[k].total += 1;
        if (bfi[k]) bfiYes[k].yes += 1;
      }
    }
  }

  const uniqueRespondentsWithAnswers = await prisma.heroAnswer.findMany({
    distinct: ["respondentId"],
    select: { respondentId: true },
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: {
      respondentsTotal,
      respondentsCompleted,
      respondentsWithAnswers: uniqueRespondentsWithAnswers.length,
      answersTotal,
      interestsTotal,
      publishedBooks: books.length,
      publishedHeroes: books.reduce((n, b) => n + b.heroes.length, 0),
    },
    guessTotals,
    bfiYesRates: Object.fromEntries(
      Object.entries(bfiYes).map(([k, v]) => [
        k,
        { yes: v.yes, total: v.total, rate: v.total ? v.yes / v.total : 0 },
      ]),
    ),
    byBook: [...byBook.values()].sort((a, b) => b.answers - a.answers),
    byHero: [...byHero.values()].sort((a, b) => b.answers - a.answers),
    daily: dailyRaw
      .map((d) => ({
        day: new Date(d.day).toISOString().slice(0, 10),
        count: Number(d.count),
      }))
      .reverse(),
    recent: recentAnswers.map((a) => {
      const meta = heroMeta.get(a.heroId);
      return {
        id: a.id,
        respondentId: a.respondentId,
        bookSlug: a.bookSlug,
        bookTitleRu: meta?.bookTitleRu || a.bookSlug,
        heroId: a.heroId,
        heroNameRu: meta?.nameRu || a.heroId,
        guess: a.guess,
        bfi: a.bfi,
        createdAt: a.createdAt.toISOString(),
      };
    }),
    interests: interests.map((i) => ({
      id: i.id,
      email: i.email,
      createdAt: i.createdAt.toISOString(),
      respondentId: i.respondentId,
      respondentCreatedAt: i.respondent.createdAt.toISOString(),
      respondentCompletedAt: i.respondent.completedAt?.toISOString() || null,
      locale: i.respondent.locale || null,
      answersCount: i.respondent._count.answers,
    })),
  });
}
