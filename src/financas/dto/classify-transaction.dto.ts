import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ClassifyTransactionDto {
  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  createLoan?: boolean;

  @IsOptional()
  @IsString()
  borrowerName?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoanItemDto)
  loanItems?: LoanItemDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  linkedLoanIds?: string[];
}

export class LoanItemDto {
  @IsNumber()
  amount: number;

  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
