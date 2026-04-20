-- CreateEnum
CREATE TYPE "public"."ImportBatchStatus" AS ENUM ('IMPORTED', 'REVERTED');

-- CreateEnum
CREATE TYPE "public"."ImportBatchType" AS ENUM ('IMPORT', 'REIMPORT');

-- AlterTable
ALTER TABLE "public"."Transaction"
ADD COLUMN "importBatchId" TEXT;

-- CreateTable
CREATE TABLE "public"."ImportedCsvFile" (
    "idImportedFile" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportedCsvFile_pkey" PRIMARY KEY ("idImportedFile")
);

-- CreateTable
CREATE TABLE "public"."TransactionImportBatch" (
    "idImportBatch" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "importedFileId" TEXT NOT NULL,
    "batchType" "public"."ImportBatchType" NOT NULL DEFAULT 'IMPORT',
    "status" "public"."ImportBatchStatus" NOT NULL DEFAULT 'IMPORTED',
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "restoredFromTrashCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "movedToTrashCount" INTEGER NOT NULL DEFAULT 0,
    "deletedCount" INTEGER NOT NULL DEFAULT 0,
    "revertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionImportBatch_pkey" PRIMARY KEY ("idImportBatch")
);

-- CreateIndex
CREATE INDEX "Transaction_importBatchId_idx" ON "public"."Transaction"("importBatchId");

-- CreateIndex
CREATE INDEX "ImportedCsvFile_userId_idx" ON "public"."ImportedCsvFile"("userId");

-- CreateIndex
CREATE INDEX "ImportedCsvFile_contentHash_idx" ON "public"."ImportedCsvFile"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedCsvFile_userId_contentHash_key" ON "public"."ImportedCsvFile"("userId", "contentHash");

-- CreateIndex
CREATE INDEX "TransactionImportBatch_userId_idx" ON "public"."TransactionImportBatch"("userId");

-- CreateIndex
CREATE INDEX "TransactionImportBatch_importedFileId_idx" ON "public"."TransactionImportBatch"("importedFileId");

-- CreateIndex
CREATE INDEX "TransactionImportBatch_status_idx" ON "public"."TransactionImportBatch"("status");

-- CreateIndex
CREATE INDEX "TransactionImportBatch_createdAt_idx" ON "public"."TransactionImportBatch"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Transaction"
ADD CONSTRAINT "Transaction_importBatchId_fkey"
FOREIGN KEY ("importBatchId") REFERENCES "public"."TransactionImportBatch"("idImportBatch") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ImportedCsvFile"
ADD CONSTRAINT "ImportedCsvFile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransactionImportBatch"
ADD CONSTRAINT "TransactionImportBatch_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransactionImportBatch"
ADD CONSTRAINT "TransactionImportBatch_importedFileId_fkey"
FOREIGN KEY ("importedFileId") REFERENCES "public"."ImportedCsvFile"("idImportedFile") ON DELETE CASCADE ON UPDATE CASCADE;
