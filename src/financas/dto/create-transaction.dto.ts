import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsDateString()
  date: string;

  @IsNumber()
  value: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
