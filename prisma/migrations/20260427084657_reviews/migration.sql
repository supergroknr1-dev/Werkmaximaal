-- CreateTable
CREATE TABLE "public"."Review" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "consumentId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "tekst" TEXT,
    "fotoUrls" TEXT[],
    "aangemaakt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Review_leadId_key" ON "public"."Review"("leadId");

-- CreateIndex
CREATE INDEX "Review_consumentId_idx" ON "public"."Review"("consumentId");

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_consumentId_fkey" FOREIGN KEY ("consumentId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
