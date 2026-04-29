-- CreateTable
CREATE TABLE "public"."ChatBericht" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "vanUserId" INTEGER NOT NULL,
    "tekst" TEXT NOT NULL,
    "gelezen" BOOLEAN NOT NULL DEFAULT false,
    "aangemaakt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatBericht_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatBericht_leadId_aangemaakt_idx" ON "public"."ChatBericht"("leadId", "aangemaakt");

-- CreateIndex
CREATE INDEX "ChatBericht_vanUserId_idx" ON "public"."ChatBericht"("vanUserId");

-- AddForeignKey
ALTER TABLE "public"."ChatBericht" ADD CONSTRAINT "ChatBericht_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatBericht" ADD CONSTRAINT "ChatBericht_vanUserId_fkey" FOREIGN KEY ("vanUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
