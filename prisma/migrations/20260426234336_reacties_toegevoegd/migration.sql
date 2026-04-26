-- CreateTable
CREATE TABLE "public"."Reactie" (
    "id" SERIAL NOT NULL,
    "klusId" INTEGER NOT NULL,
    "naam" TEXT NOT NULL,
    "bericht" TEXT NOT NULL,
    "aangemaakt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reactie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reactie_klusId_idx" ON "public"."Reactie"("klusId");

-- AddForeignKey
ALTER TABLE "public"."Reactie" ADD CONSTRAINT "Reactie_klusId_fkey" FOREIGN KEY ("klusId") REFERENCES "public"."Klus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
