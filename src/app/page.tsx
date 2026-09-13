import { cookies } from "next/headers";
import { validate as uuidValidate } from "uuid";
import { HomeClient } from "@/components/HomeClient";
import { prisma } from "@/lib/prisma";
import { RESPONDENT_COOKIE } from "@/lib/respondent";
import { payloadFromAnswers, type BfiAnswers, type GumilevGroup } from "@/lib/quiz";

export const dynamic = "force-dynamic";

async function loadBootstrap() {
  const jar = await cookies();
  const rid = jar.get(RESPONDENT_COOKIE)?.value;

  const booksPromise = prisma.book.findMany({
    where: { status: "published" },
    orderBy: { sortOrder: "asc" },
    include: { heroes: { orderBy: { sortOrder: "asc" } } },
  });

  let status: "new" | "in_progress" | "completed" = "in_progress";
  let progress = {
    guesses: {} as Record<string, GumilevGroup>,
    bfiAnswers: {} as Record<string, BfiAnswers>,
  };
  let needsCookie = true;

  if (rid && uuidValidate(rid)) {
    const respondent = await prisma.respondent.findUnique({
      where: { id: rid },
      include: { answers: true },
    });
    if (respondent) {
      needsCookie = false;
      if (respondent.completedAt) {
        status = "completed";
      } else if (respondent.answers.length > 0) {
        status = "in_progress";
        progress = payloadFromAnswers(respondent.answers) as typeof progress;
      }
    }
  }

  const books = await booksPromise;

  return {
    status,
    needsCookie,
    completedAt: null as string | null,
    books: books.map((b) => ({
      id: b.id,
      slug: b.slug,
      titleRu: b.titleRu,
      titleEn: b.titleEn,
      heroes: b.heroes.map((h) => ({
        id: h.id,
        nameRu: h.nameRu,
        nameEn: h.nameEn,
        subRu: h.subRu,
        subEn: h.subEn,
        group: h.group as GumilevGroup,
        descRu: h.descRu,
        descEn: h.descEn,
        scores: h.scores as number[],
      })),
    })),
    progress,
  };
}

export default async function HomePage() {
  const bootstrap = await loadBootstrap();
  return <HomeClient bootstrap={bootstrap} />;
}
