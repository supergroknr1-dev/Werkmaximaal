-- DropIndex
DROP INDEX "public"."Trefwoord_categorieId_idx";

-- AlterTable
ALTER TABLE "public"."Trefwoord" ADD COLUMN     "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[];
