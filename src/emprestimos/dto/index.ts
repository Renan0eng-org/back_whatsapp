import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

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
