import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWhatsAppWebSessionDto {
  @IsString()
  @IsNotEmpty()
  sessionName: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
