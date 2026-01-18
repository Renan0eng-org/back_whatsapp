-- AlterTable
ALTER TABLE "public"."RecurringExpense" ADD COLUMN     "isMainExpense" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "recurringGroupId" TEXT;

-- CreateIndex
CREATE INDEX "RecurringExpense_recurringGroupId_idx" ON "public"."RecurringExpense"("recurringGroupId");
