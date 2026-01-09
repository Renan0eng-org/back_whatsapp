-- CreateEnum
CREATE TYPE "public"."WhatsAppMessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'BUTTON', 'LIST');

-- CreateEnum
CREATE TYPE "public"."WhatsAppMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "public"."WhatsAppMessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "public"."WhatsAppConfig" (
    "idConfig" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "displayName" TEXT,
    "webhookUrl" TEXT,
    "verifyToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConfig_pkey" PRIMARY KEY ("idConfig")
);

-- CreateTable
CREATE TABLE "public"."WhatsAppMessage" (
    "idMessage" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "contactName" TEXT,
    "contactWaId" TEXT,
    "messageType" "public"."WhatsAppMessageType" NOT NULL DEFAULT 'TEXT',
    "direction" "public"."WhatsAppMessageDirection" NOT NULL,
    "status" "public"."WhatsAppMessageStatus" NOT NULL DEFAULT 'PENDING',
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "caption" TEXT,
    "externalId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("idMessage")
);

-- CreateIndex
CREATE INDEX "WhatsAppConfig_userId_idx" ON "public"."WhatsAppConfig"("userId");

-- CreateIndex
CREATE INDEX "WhatsAppConfig_phoneNumberId_idx" ON "public"."WhatsAppConfig"("phoneNumberId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_configId_idx" ON "public"."WhatsAppMessage"("configId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_phoneNumber_idx" ON "public"."WhatsAppMessage"("phoneNumber");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_createdAt_idx" ON "public"."WhatsAppMessage"("createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_direction_idx" ON "public"."WhatsAppMessage"("direction");

-- AddForeignKey
ALTER TABLE "public"."WhatsAppConfig" ADD CONSTRAINT "WhatsAppConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_configId_fkey" FOREIGN KEY ("configId") REFERENCES "public"."WhatsAppConfig"("idConfig") ON DELETE CASCADE ON UPDATE CASCADE;
