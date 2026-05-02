-- AlterTable
ALTER TABLE "public"."Klus" ADD COLUMN     "gerelateerdeAanId" INTEGER;

-- CreateTable
CREATE TABLE "public"."BeroepRelatie" (
    "id" SERIAL NOT NULL,
    "primaireId" INTEGER NOT NULL,
    "gerelateerdeId" INTEGER NOT NULL,
    "uitleg" TEXT NOT NULL,

    CONSTRAINT "BeroepRelatie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BeroepRelatie_primaireId_idx" ON "public"."BeroepRelatie"("primaireId");

-- CreateIndex
CREATE UNIQUE INDEX "BeroepRelatie_primaireId_gerelateerdeId_key" ON "public"."BeroepRelatie"("primaireId", "gerelateerdeId");

-- CreateIndex
CREATE INDEX "Klus_gerelateerdeAanId_idx" ON "public"."Klus"("gerelateerdeAanId");

-- AddForeignKey
ALTER TABLE "public"."Klus" ADD CONSTRAINT "Klus_gerelateerdeAanId_fkey" FOREIGN KEY ("gerelateerdeAanId") REFERENCES "public"."Klus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BeroepRelatie" ADD CONSTRAINT "BeroepRelatie_primaireId_fkey" FOREIGN KEY ("primaireId") REFERENCES "public"."Categorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BeroepRelatie" ADD CONSTRAINT "BeroepRelatie_gerelateerdeId_fkey" FOREIGN KEY ("gerelateerdeId") REFERENCES "public"."Categorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
