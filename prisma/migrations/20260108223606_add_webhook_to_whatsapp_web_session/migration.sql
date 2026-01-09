-- AlterTable
ALTER TABLE "public"."WhatsAppWebSession" ADD COLUMN     "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "webhookUrl" TEXT;
