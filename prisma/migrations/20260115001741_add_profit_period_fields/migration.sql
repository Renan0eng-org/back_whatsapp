-- Create enum for period rule
CREATE TYPE "PeriodRule" AS ENUM ('MENSAL', 'ANUAL');

-- Add new fields to Loan table
ALTER TABLE "Loan" 
ADD COLUMN "periodRule" "PeriodRule" DEFAULT 'MENSAL',
ADD COLUMN "marketReference" DOUBLE PRECISION,
ADD COLUMN "expectedProfit" DOUBLE PRECISION;
