/*
  Warnings:

  - You are about to drop the column `category` on the `Loan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Loan" DROP COLUMN "category",
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "transactionId" TEXT;

-- CreateIndex
CREATE INDEX "Loan_categoryId_idx" ON "public"."Loan"("categoryId");

-- AddForeignKey
ALTER TABLE "public"."Loan" ADD CONSTRAINT "Loan_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."ExpenseCategory"("idCategory") ON DELETE SET NULL ON UPDATE CASCADE;
