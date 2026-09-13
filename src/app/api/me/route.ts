import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateRespondentId } from "@/lib/respondent";
import { payloadFromAnswers, type GumilevGroup } from "@/lib/quiz";

export async function GET() {
  const id = await getOrCreateRespondentId();
  const respondent = await prisma.respondent.findUnique({
    where: { id },
    include: {
      answers: true,
      response: true,
    },
  });

  if (!respondent) {
    return NextResponse.json({ status: "new" as const, respondentId: id });
  }

  if (respondent.completedAt) {
    return NextResponse.json({
      status: "completed" as const,
      respondentId: id,
      completedAt: respondent.completedAt,
    });
  }

  const payload = payloadFromAnswers(respondent.answers);
  return NextResponse.json({
    status: respondent.answers.length > 0 ? ("in_progress" as const) : ("new" as const),
    respondentId: id,
    progress: {
      guesses: payload.guesses,
      bfiAnswers: payload.bfiAnswers,
      answers: respondent.answers.map((a) => ({
        bookSlug: a.bookSlug,
        heroId: a.heroId,
        guess: a.guess as GumilevGroup,
        bfi: a.bfi,
      })),
    },
  });
}
