-- CreateTable
CREATE TABLE "public"."ActivityEvent" (
    "id" BIGSERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "tijdstip" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" INTEGER,
    "actorRol" TEXT,
    "targetType" TEXT,
    "targetId" INTEGER,
    "payload" JSONB NOT NULL,
    "ipHash" TEXT,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "tijdstip" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" INTEGER NOT NULL,
    "adminNaam" TEXT NOT NULL,
    "actie" TEXT NOT NULL,
    "actieCategorie" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER,
    "payload" JSONB NOT NULL,
    "reden" TEXT NOT NULL,
    "ipAdres" TEXT,
    "userAgent" TEXT,
    "goedgekeurdDoor" INTEGER,
    "goedgekeurdOp" TIMESTAMP(3),
    "vorigHash" BYTEA,
    "rijHash" BYTEA NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityEvent_tijdstip_idx" ON "public"."ActivityEvent"("tijdstip");

-- CreateIndex
CREATE INDEX "ActivityEvent_type_tijdstip_idx" ON "public"."ActivityEvent"("type", "tijdstip");

-- CreateIndex
CREATE INDEX "ActivityEvent_actorId_tijdstip_idx" ON "public"."ActivityEvent"("actorId", "tijdstip");

-- CreateIndex
CREATE INDEX "ActivityEvent_targetType_targetId_idx" ON "public"."ActivityEvent"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_tijdstip_idx" ON "public"."AuditLog"("tijdstip");

-- CreateIndex
CREATE INDEX "AuditLog_adminId_tijdstip_idx" ON "public"."AuditLog"("adminId", "tijdstip");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "public"."AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_actieCategorie_tijdstip_idx" ON "public"."AuditLog"("actieCategorie", "tijdstip");
