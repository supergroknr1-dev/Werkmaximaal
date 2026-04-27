-- AlterTable
ALTER TABLE "public"."Klus" ADD COLUMN     "goedgekeurd" BOOLEAN NOT NULL DEFAULT false;

-- Bestaande klussen waren al live; auto-goedkeuren zodat ze niet
-- ineens uit de publieke lijst verdwijnen.
UPDATE "public"."Klus" SET "goedgekeurd" = true;
