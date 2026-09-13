import { requireAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

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

  const interests = await prisma.interest.findMany({
    orderBy: { createdAt: "asc" },
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
  });

  const header = [
    "interest_id",
    "email",
    "left_at",
    "respondent_id",
    "respondent_created_at",
    "respondent_completed_at",
    "locale",
    "answers_count",
  ];

  const lines = [header.join(",")];
  for (const i of interests) {
    lines.push(
      [
        i.id,
        i.email,
        i.createdAt.toISOString(),
        i.respondentId,
        i.respondent.createdAt.toISOString(),
        i.respondent.completedAt?.toISOString() || "",
        i.respondent.locale || "",
        i.respondent._count.answers,
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
      "Content-Disposition": `attachment; filename="passion-contacts-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
