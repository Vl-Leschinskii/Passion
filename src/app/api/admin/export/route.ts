import { requireAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type Bfi = { O?: boolean; C?: boolean; E?: boolean; A?: boolean; N?: boolean };

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const email = await requireAdminEmail();
  if (!email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [books, answers, respondents, interests] = await Promise.all([
    prisma.book.findMany({
      include: { heroes: true },
    }),
    prisma.heroAnswer.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.respondent.findMany({
      select: { id: true, createdAt: true, completedAt: true, locale: true },
    }),
    prisma.interest.findMany({
      select: { respondentId: true, email: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const contactByRespondent = new Map<string, { email: string; leftAt: string }>();
  for (const i of interests) {
    // Keep the latest email if a respondent left more than one.
    contactByRespondent.set(i.respondentId, {
      email: i.email,
      leftAt: i.createdAt.toISOString(),
    });
  }

  const heroMeta = new Map<string, { nameRu: string; nameEn: string; bookTitleRu: string; bookTitleEn: string }>();
  for (const book of books) {
    for (const hero of book.heroes) {
      heroMeta.set(hero.id, {
        nameRu: hero.nameRu,
        nameEn: hero.nameEn,
        bookTitleRu: book.titleRu,
        bookTitleEn: book.titleEn,
      });
    }
  }
  const respondentMeta = new Map(
    respondents.map((r) => [
      r.id,
      {
        createdAt: r.createdAt.toISOString(),
        completedAt: r.completedAt?.toISOString() || "",
        locale: r.locale || "",
      },
    ]),
  );

  const header = [
    "answer_id",
    "respondent_id",
    "contact_email",
    "contact_left_at",
    "respondent_created_at",
    "respondent_completed_at",
    "respondent_locale",
    "book_slug",
    "book_title_ru",
    "book_title_en",
    "hero_id",
    "hero_name_ru",
    "hero_name_en",
    "guess",
    "bfi_O",
    "bfi_C",
    "bfi_E",
    "bfi_A",
    "bfi_N",
    "answer_created_at",
    "answer_updated_at",
  ];

  const lines = [header.join(",")];
  for (const a of answers) {
    const h = heroMeta.get(a.heroId);
    const r = respondentMeta.get(a.respondentId);
    const contact = contactByRespondent.get(a.respondentId);
    const bfi = (a.bfi || {}) as Bfi;
    lines.push(
      [
        a.id,
        a.respondentId,
        contact?.email || "",
        contact?.leftAt || "",
        r?.createdAt || "",
        r?.completedAt || "",
        r?.locale || "",
        a.bookSlug,
        h?.bookTitleRu || "",
        h?.bookTitleEn || "",
        a.heroId,
        h?.nameRu || "",
        h?.nameEn || "",
        a.guess,
        bfi.O,
        bfi.C,
        bfi.E,
        bfi.A,
        bfi.N,
        a.createdAt.toISOString(),
        a.updatedAt.toISOString(),
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(lines.join("\n") + "\n", {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="passion-answers-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
