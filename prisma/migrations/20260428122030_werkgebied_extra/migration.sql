-- CreateTable
CREATE TABLE "public"."WerkgebiedExtra" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "waarde" TEXT NOT NULL,
    "werkafstand" INTEGER NOT NULL,

    CONSTRAINT "WerkgebiedExtra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WerkgebiedExtra_userId_idx" ON "public"."WerkgebiedExtra"("userId");

-- AddForeignKey
ALTER TABLE "public"."WerkgebiedExtra" ADD CONSTRAINT "WerkgebiedExtra_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
