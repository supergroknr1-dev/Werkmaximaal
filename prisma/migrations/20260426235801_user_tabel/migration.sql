-- AlterTable
ALTER TABLE "public"."Klus" ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "public"."Reactie" ADD COLUMN     "userId" INTEGER;

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "wachtwoordHash" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "bedrijfsnaam" TEXT,
    "kvkNummer" TEXT,
    "telefoon" TEXT,
    "werkafstand" INTEGER,
    "regioPostcode" TEXT,
    "aangemaakt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_rol_idx" ON "public"."User"("rol");

-- CreateIndex
CREATE INDEX "Klus_userId_idx" ON "public"."Klus"("userId");

-- CreateIndex
CREATE INDEX "Reactie_userId_idx" ON "public"."Reactie"("userId");

-- AddForeignKey
ALTER TABLE "public"."Klus" ADD CONSTRAINT "Klus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reactie" ADD CONSTRAINT "Reactie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
