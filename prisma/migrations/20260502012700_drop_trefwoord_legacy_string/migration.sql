-- Drop oude string-unique en categorie-kolom; maak categorieId required + nieuwe unique.
-- Data is al backfilled — `categorieId` is voor alle rijen gevuld vanuit de
-- voorgaande migratie + handmatig backfill-script.

-- DropIndex
DROP INDEX "Trefwoord_categorie_woord_key";

-- AlterTable: maak categorieId NOT NULL
ALTER TABLE "Trefwoord" ALTER COLUMN "categorieId" SET NOT NULL;

-- AlterTable: drop legacy string-kolom
ALTER TABLE "Trefwoord" DROP COLUMN "categorie";

-- CreateIndex
CREATE UNIQUE INDEX "Trefwoord_categorieId_woord_key" ON "Trefwoord"("categorieId", "woord");
