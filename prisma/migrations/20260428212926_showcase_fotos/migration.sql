-- CreateTable
CREATE TABLE "public"."ShowcaseFoto" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "beschrijving" TEXT,
    "volgorde" INTEGER NOT NULL DEFAULT 0,
    "aangemaakt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShowcaseFoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShowcaseFoto_userId_volgorde_idx" ON "public"."ShowcaseFoto"("userId", "volgorde");

-- AddForeignKey
ALTER TABLE "public"."ShowcaseFoto" ADD CONSTRAINT "ShowcaseFoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
