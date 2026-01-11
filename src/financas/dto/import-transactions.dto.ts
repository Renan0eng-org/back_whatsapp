import { IsOptional, IsString } from 'class-validator';

export class ImportTransactionsDto {
  @IsOptional()
  @IsString()
  userId?: string;
}
