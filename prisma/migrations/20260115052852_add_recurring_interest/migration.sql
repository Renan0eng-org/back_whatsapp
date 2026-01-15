-- AlterTable
ALTER TABLE "public"."Loan" ADD COLUMN     "isRecurringInterest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurringInterestDay" INTEGER;

-- CreateTable
CREATE TABLE "public"."RecurringInterestPayment" (
    "idPayment" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "referenceMonth" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidDate" TIMESTAMP(3),
    "transactionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringInterestPayment_pkey" PRIMARY KEY ("idPayment")
);

-- CreateIndex
CREATE INDEX "RecurringInterestPayment_loanId_idx" ON "public"."RecurringInterestPayment"("loanId");

-- CreateIndex
CREATE INDEX "RecurringInterestPayment_referenceMonth_idx" ON "public"."RecurringInterestPayment"("referenceMonth");

-- CreateIndex
CREATE INDEX "RecurringInterestPayment_isPaid_idx" ON "public"."RecurringInterestPayment"("isPaid");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringInterestPayment_loanId_referenceMonth_key" ON "public"."RecurringInterestPayment"("loanId", "referenceMonth");

-- CreateIndex
CREATE INDEX "Loan_isRecurringInterest_idx" ON "public"."Loan"("isRecurringInterest");

-- AddForeignKey
ALTER TABLE "public"."RecurringInterestPayment" ADD CONSTRAINT "RecurringInterestPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."Loan"("idLoan") ON DELETE CASCADE ON UPDATE CASCADE;
