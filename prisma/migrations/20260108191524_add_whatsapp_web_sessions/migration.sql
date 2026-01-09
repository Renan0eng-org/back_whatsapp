-- AlterTable
ALTER TABLE "public"."WhatsAppMessage" ADD COLUMN     "sessionId" TEXT,
ALTER COLUMN "configId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."WhatsAppWebSession" (
    "idSession" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionName" TEXT NOT NULL,
    "displayName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "phoneNumber" TEXT,
    "qrCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppWebSession_pkey" PRIMARY KEY ("idSession")
);

-- CreateIndex
CREATE INDEX "WhatsAppWebSession_userId_idx" ON "public"."WhatsAppWebSession"("userId");

-- CreateIndex
CREATE INDEX "WhatsAppWebSession_status_idx" ON "public"."WhatsAppWebSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppWebSession_userId_sessionName_key" ON "public"."WhatsAppWebSession"("userId", "sessionName");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_sessionId_idx" ON "public"."WhatsAppMessage"("sessionId");

-- AddForeignKey
ALTER TABLE "public"."WhatsAppWebSession" ADD CONSTRAINT "WhatsAppWebSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."WhatsAppWebSession"("idSession") ON DELETE CASCADE ON UPDATE CASCADE;
