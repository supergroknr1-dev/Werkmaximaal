-- AlterTable
ALTER TABLE "public"."Trefwoord" ADD COLUMN     "categorieId" INTEGER;

-- CreateIndex
CREATE INDEX "Trefwoord_categorieId_idx" ON "public"."Trefwoord"("categorieId");

-- CreateIndex
CREATE INDEX "Trefwoord_type_idx" ON "public"."Trefwoord"("type");

-- AddForeignKey
ALTER TABLE "public"."Trefwoord" ADD CONSTRAINT "Trefwoord_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "public"."Categorie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
