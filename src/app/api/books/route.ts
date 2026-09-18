import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const books = await prisma.book.findMany({
    where: { status: "published" },
    orderBy: { sortOrder: "asc" },
    include: {
      heroes: { orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json({
    books: books.map((b) => ({
      id: b.id,
      slug: b.slug,
      titleRu: b.titleRu,
      titleEn: b.titleEn,
      heroes: b.heroes.map((h) => ({
        id: h.id,
        nameRu: h.nameRu,
        nameEn: h.nameEn,
        group: h.group,
        descRu: h.descRu,
        descEn: h.descEn,
        scores: h.scores as number[],
      })),
    })),
  });
}
