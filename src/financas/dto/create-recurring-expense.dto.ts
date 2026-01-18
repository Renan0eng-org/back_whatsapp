import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRecurringExpenseDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  qrCode?: string;

  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  registrationDate?: Date;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  recurringEndDate?: Date;
}

export class UpdateRecurringExpenseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  recurringEndDate?: Date;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  qrCode?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;
}

export class MarkExpenseAsPaidDto {
  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  paidDate?: Date;
}
