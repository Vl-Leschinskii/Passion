import { createHash } from "crypto";
import type { Hero } from "@prisma/client";

export type BfiAnswers = Record<"O" | "C" | "E" | "A" | "N", boolean>;
export type GumilevGroup = "passi" | "garm" | "sub";

export type ResponsePayload = {
  guesses: Record<string, GumilevGroup>;
  bfiAnswers: Record<string, BfiAnswers>;
};

export function heroKey(bookSlug: string, heroId: string) {
  return `${bookSlug}:${heroId}`;
}

export function bookSetHash(heroes: { id: string }[]) {
  const ids = heroes.map((h) => h.id).sort().join("|");
  return createHash("sha256").update(ids).digest("hex");
}

export function isFullBfi(bfi: Partial<BfiAnswers> | null | undefined): bfi is BfiAnswers {
  if (!bfi) return false;
  return (["O", "C", "E", "A", "N"] as const).every((k) => typeof bfi[k] === "boolean");
}

export function isHeroAnswerComplete(
  guess: string | undefined,
  bfi: Partial<BfiAnswers> | null | undefined,
) {
  return Boolean(guess && ["passi", "garm", "sub"].includes(guess) && isFullBfi(bfi));
}

export function validatePayload(
  payload: ResponsePayload,
  heroes: Array<Pick<Hero, "id"> & { book: { slug: string } }>,
): string | null {
  for (const hero of heroes) {
    const key = heroKey(hero.book.slug, hero.id);
    const guess = payload.guesses?.[key];
    if (!guess || !["passi", "garm", "sub"].includes(guess)) {
      return `Missing or invalid Gumilev guess for ${key}`;
    }
    const bfi = payload.bfiAnswers?.[key];
    if (!isFullBfi(bfi)) return `Missing BFI answers for ${key}`;
  }
  return null;
}

export function payloadFromAnswers(
  answers: Array<{
    bookSlug: string;
    heroId: string;
    guess: string;
    bfi: unknown;
  }>,
): ResponsePayload {
  const payload: ResponsePayload = { guesses: {}, bfiAnswers: {} };
  for (const a of answers) {
    const key = heroKey(a.bookSlug, a.heroId);
    if (["passi", "garm", "sub"].includes(a.guess) && isFullBfi(a.bfi as Partial<BfiAnswers>)) {
      payload.guesses[key] = a.guess as GumilevGroup;
      payload.bfiAnswers[key] = a.bfi as BfiAnswers;
    }
  }
  return payload;
}
