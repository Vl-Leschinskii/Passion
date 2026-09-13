-- AlterTable
ALTER TABLE "Response" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "HeroAnswer" (
    "id" TEXT NOT NULL,
    "respondentId" UUID NOT NULL,
    "heroId" TEXT NOT NULL,
    "bookSlug" TEXT NOT NULL,
    "guess" TEXT NOT NULL,
    "bfi" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeroAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HeroAnswer_respondentId_idx" ON "HeroAnswer"("respondentId");

-- CreateIndex
CREATE INDEX "HeroAnswer_bookSlug_idx" ON "HeroAnswer"("bookSlug");

-- CreateIndex
CREATE UNIQUE INDEX "HeroAnswer_respondentId_heroId_key" ON "HeroAnswer"("respondentId", "heroId");

-- AddForeignKey
ALTER TABLE "HeroAnswer" ADD CONSTRAINT "HeroAnswer_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "Respondent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
