-- CreateTable
CREATE TABLE "public"."Loan" (
    "idLoan" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "borrowerName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("idLoan")
);

-- CreateIndex
CREATE INDEX "Loan_userId_idx" ON "public"."Loan"("userId");

-- CreateIndex
CREATE INDEX "Loan_dueDate_idx" ON "public"."Loan"("dueDate");

-- CreateIndex
CREATE INDEX "Loan_isPaid_idx" ON "public"."Loan"("isPaid");

-- AddForeignKey
ALTER TABLE "public"."Loan" ADD CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;
