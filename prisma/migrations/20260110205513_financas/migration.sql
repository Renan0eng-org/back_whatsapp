-- CreateEnum
CREATE TYPE "public"."ExpenseCategoryEnum" AS ENUM ('ALIMENTACAO', 'TRANSPORTE', 'UTILIDADES', 'SAUDE', 'EDUCACAO', 'LAZER', 'TELEFONE', 'INTERNET', 'SEGUROS', 'IMPOSTOS', 'RENDA', 'INVESTIMENTOS', 'OUTRAS');

-- CreateTable
CREATE TABLE "public"."ExpenseCategory" (
    "idCategory" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#808080',
    "icon" TEXT,
    "type" "public"."ExpenseCategoryEnum" NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("idCategory")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "idTransaction" TEXT NOT NULL,
    "externalId" TEXT,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "isClassified" BOOLEAN NOT NULL DEFAULT false,
    "aiSuggestion" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("idTransaction")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "public"."ExpenseCategory"("name");

-- CreateIndex
CREATE INDEX "ExpenseCategory_userId_idx" ON "public"."ExpenseCategory"("userId");

-- CreateIndex
CREATE INDEX "ExpenseCategory_type_idx" ON "public"."ExpenseCategory"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_externalId_key" ON "public"."Transaction"("externalId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "public"."Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "public"."Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_categoryId_idx" ON "public"."Transaction"("categoryId");

-- CreateIndex
CREATE INDEX "Transaction_isClassified_idx" ON "public"."Transaction"("isClassified");

-- CreateIndex
CREATE INDEX "Transaction_externalId_idx" ON "public"."Transaction"("externalId");

-- AddForeignKey
ALTER TABLE "public"."ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."ExpenseCategory"("idCategory") ON DELETE SET NULL ON UPDATE CASCADE;
