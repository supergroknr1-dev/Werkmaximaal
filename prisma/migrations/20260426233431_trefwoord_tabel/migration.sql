-- CreateTable
CREATE TABLE "public"."Trefwoord" (
    "id" SERIAL NOT NULL,
    "categorie" TEXT NOT NULL,
    "woord" TEXT NOT NULL,

    CONSTRAINT "Trefwoord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trefwoord_categorie_woord_key" ON "public"."Trefwoord"("categorie", "woord");
