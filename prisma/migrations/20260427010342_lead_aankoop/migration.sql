-- CreateTable
CREATE TABLE "public"."Lead" (
    "id" SERIAL NOT NULL,
    "klusId" INTEGER NOT NULL,
    "vakmanId" INTEGER NOT NULL,
    "bedrag" INTEGER NOT NULL,
    "gekochtOp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_klusId_idx" ON "public"."Lead"("klusId");

-- CreateIndex
CREATE INDEX "Lead_vakmanId_idx" ON "public"."Lead"("vakmanId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_klusId_vakmanId_key" ON "public"."Lead"("klusId", "vakmanId");

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_klusId_fkey" FOREIGN KEY ("klusId") REFERENCES "public"."Klus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_vakmanId_fkey" FOREIGN KEY ("vakmanId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
