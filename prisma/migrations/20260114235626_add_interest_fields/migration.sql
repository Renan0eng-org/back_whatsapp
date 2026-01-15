-- Create enum for interest type
CREATE TYPE "InterestType" AS ENUM ('SIMPLE', 'COMPOUND');

-- Add interest fields to Loan table
ALTER TABLE "Loan" ADD COLUMN "interestRate" DOUBLE PRECISION,
ADD COLUMN "interestType" "InterestType" DEFAULT 'SIMPLE';
