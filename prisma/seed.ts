import { PrismaClient } from "@prisma/client";
import { SEED_BOOKS } from "../src/data/seed-books";

const prisma = new PrismaClient();

async function main() {
  for (const book of SEED_BOOKS) {
    const existing = await prisma.book.findUnique({ where: { slug: book.slug } });
    if (existing) {
      console.log(`Skip existing book: ${book.slug}`);
      continue;
    }

    await prisma.book.create({
      data: {
        slug: book.slug,
        titleRu: book.titleRu,
        titleEn: book.titleEn,
        sortOrder: book.sortOrder,
        status: "published",
        heroes: {
          create: book.heroes.map((h, i) => ({
            sortOrder: i,
            nameRu: h.nameRu,
            nameEn: h.nameEn,
            subRu: h.subRu,
            subEn: h.subEn,
            group: h.group,
            descRu: h.descRu,
            descEn: h.descEn,
            scores: h.scores,
          })),
        },
      },
    });
    console.log(`Seeded book: ${book.slug}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
