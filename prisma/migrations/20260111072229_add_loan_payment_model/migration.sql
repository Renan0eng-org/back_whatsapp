/*
  Warnings:

  - You are about to drop the column `paymentTransactionId` on the `Loan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Loan" DROP COLUMN "paymentTransactionId";

-- CreateTable
CREATE TABLE "public"."LoanPayment" (
    "idPayment" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanPayment_pkey" PRIMARY KEY ("idPayment")
);

-- CreateIndex
CREATE INDEX "LoanPayment_loanId_idx" ON "public"."LoanPayment"("loanId");

-- CreateIndex
CREATE INDEX "LoanPayment_transactionId_idx" ON "public"."LoanPayment"("transactionId");

-- AddForeignKey
ALTER TABLE "public"."LoanPayment" ADD CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."Loan"("idLoan") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoanPayment" ADD CONSTRAINT "LoanPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("idTransaction") ON DELETE CASCADE ON UPDATE CASCADE;
