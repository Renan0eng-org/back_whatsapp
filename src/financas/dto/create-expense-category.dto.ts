import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ExpenseCategoryEnum } from 'generated/prisma';

export class CreateExpenseCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ExpenseCategoryEnum)
  type: ExpenseCategoryEnum;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}
