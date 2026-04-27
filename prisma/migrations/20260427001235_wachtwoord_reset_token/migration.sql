-- CreateTable
CREATE TABLE "public"."WachtwoordResetToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "vervaltOp" TIMESTAMP(3) NOT NULL,
    "gebruikt" BOOLEAN NOT NULL DEFAULT false,
    "aangemaakt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WachtwoordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WachtwoordResetToken_token_key" ON "public"."WachtwoordResetToken"("token");

-- CreateIndex
CREATE INDEX "WachtwoordResetToken_userId_idx" ON "public"."WachtwoordResetToken"("userId");

-- AddForeignKey
ALTER TABLE "public"."WachtwoordResetToken" ADD CONSTRAINT "WachtwoordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
