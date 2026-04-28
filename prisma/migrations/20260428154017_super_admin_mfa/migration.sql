-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "recoveryCodesHash" TEXT[],
ADD COLUMN     "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpSecret" TEXT;
