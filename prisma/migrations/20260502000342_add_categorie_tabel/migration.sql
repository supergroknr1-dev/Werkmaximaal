-- CreateTable
CREATE TABLE "public"."Categorie" (
    "id" SERIAL NOT NULL,
    "naam" TEXT NOT NULL,
    "volgorde" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Categorie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Categorie_naam_key" ON "public"."Categorie"("naam");
