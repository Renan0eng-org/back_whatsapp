import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export enum InterestTypeEnum {
  SIMPLE = 'SIMPLE',
  COMPOUND = 'COMPOUND',
}

export enum PeriodRuleEnum {
  MENSAL = 'MENSAL',
  ANUAL = 'ANUAL',
}

export class CreateLoanDto {
  @IsString()
  borrowerName: string;

  @IsNumber()
  amount: number;

  @IsString()
  categoryId: string;

  @IsDate()
  dueDate: Date;

  @IsOptional()
  @IsNumber()
  interestRate?: number;

  @IsOptional()
  @IsEnum(InterestTypeEnum)
  interestType?: InterestTypeEnum;

  @IsOptional()
  @IsEnum(PeriodRuleEnum)
  periodRule?: PeriodRuleEnum;

  @IsOptional()
  @IsNumber()
  marketReference?: number;

  @IsOptional()
  @IsNumber()
  expectedProfit?: number;

  @IsOptional()
  @IsBoolean()
  isRecurringInterest?: boolean;

  @IsOptional()
  @IsNumber()
  recurringInterestDay?: number;

  @IsOptional()
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLoanDto {
  @IsOptional()
  @IsString()
  borrowerName?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsNumber()
  interestRate?: number;

  @IsOptional()
  @IsEnum(InterestTypeEnum)
  interestType?: InterestTypeEnum;

  @IsOptional()
  @IsEnum(PeriodRuleEnum)
  periodRule?: PeriodRuleEnum;

  @IsOptional()
  @IsNumber()
  marketReference?: number;

  @IsOptional()
  @IsNumber()
  expectedProfit?: number;

  @IsOptional()
  @IsBoolean()
  isRecurringInterest?: boolean;

  @IsOptional()
  @IsNumber()
  recurringInterestDay?: number;

  @IsOptional()
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateLoanFromTransactionDto {
  @IsString()
  transactionId: string;

  @IsOptional()
  @IsString()
  borrowerName?: string;

  @IsOptional()
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @IsNumber()
  interestRate?: number;

  @IsOptional()
  @IsEnum(InterestTypeEnum)
  interestType?: InterestTypeEnum;

  @IsOptional()
  @IsEnum(PeriodRuleEnum)
  periodRule?: PeriodRuleEnum;

  @IsOptional()
  @IsNumber()
  marketReference?: number;

  @IsOptional()
  @IsNumber()
  expectedProfit?: number;

  @IsOptional()
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateLoanItemDto {
  @IsNumber()
  amount: number;

  @IsString()
  categoryId: string;

  @IsDate()
  dueDate: Date;

  @IsOptional()
  @IsNumber()
  interestRate?: number;

  @IsOptional()
  @IsEnum(InterestTypeEnum)
  interestType?: InterestTypeEnum;

  @IsOptional()
  @IsEnum(PeriodRuleEnum)
  periodRule?: PeriodRuleEnum;

  @IsOptional()
  @IsNumber()
  marketReference?: number;

  @IsOptional()
  @IsNumber()
  expectedProfit?: number;

  @IsOptional()
  @IsBoolean()
  isRecurringInterest?: boolean;

  @IsOptional()
  @IsNumber()
  recurringInterestDay?: number;

  @IsOptional()
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateLoanBatchDto {
  @IsString()
  borrowerName: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLoanItemDto)
  items: CreateLoanItemDto[];
}

// DTO para registrar pagamento de juros recorrentes
export class PayRecurringInterestDto {
  @IsString()
  loanId: string;

  @IsDate()
  referenceMonth: Date;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO para gerar parcelas de juros recorrentes pendentes
export class GenerateRecurringInterestDto {
  @IsString()
  loanId: string;

  @IsOptional()
  @IsNumber()
  monthsAhead?: number; // Quantos meses gerar à frente (padrão: 1)
}
