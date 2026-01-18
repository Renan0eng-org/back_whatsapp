-- CreateTable
CREATE TABLE "public"."RecurringExpense" (
    "idRecurringExpense" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "companyName" TEXT,
    "categoryId" TEXT,
    "qrCode" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidDate" TIMESTAMP(3),
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("idRecurringExpense")
);

-- CreateIndex
CREATE INDEX "RecurringExpense_userId_idx" ON "public"."RecurringExpense"("userId");

-- CreateIndex
CREATE INDEX "RecurringExpense_categoryId_idx" ON "public"."RecurringExpense"("categoryId");

-- CreateIndex
CREATE INDEX "RecurringExpense_dueDate_idx" ON "public"."RecurringExpense"("dueDate");

-- CreateIndex
CREATE INDEX "RecurringExpense_isActive_idx" ON "public"."RecurringExpense"("isActive");

-- CreateIndex
CREATE INDEX "RecurringExpense_isPaid_idx" ON "public"."RecurringExpense"("isPaid");

-- AddForeignKey
ALTER TABLE "public"."RecurringExpense" ADD CONSTRAINT "RecurringExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringExpense" ADD CONSTRAINT "RecurringExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."ExpenseCategory"("idCategory") ON DELETE SET NULL ON UPDATE CASCADE;
