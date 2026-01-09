import { Module } from '@nestjs/common';
import { AcessoModule } from './acesso/acesso.module';
import { AuthModule } from './auth/auth.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './user/user.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [AuthModule, DatabaseModule, AcessoModule, UserModule, WhatsAppModule],
  providers: [AllExceptionsFilter],
})
export class AppModule {}
