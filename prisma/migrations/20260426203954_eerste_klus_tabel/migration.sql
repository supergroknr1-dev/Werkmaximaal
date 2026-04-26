-- CreateTable
CREATE TABLE "Klus" (
    "id" SERIAL NOT NULL,
    "titel" TEXT NOT NULL,
    "beschrijving" TEXT NOT NULL,
    "plaats" TEXT NOT NULL,
    "aangemaakt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Klus_pkey" PRIMARY KEY ("id")
);
