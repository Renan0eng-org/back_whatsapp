import { Module } from '@nestjs/common';
import { AcessoModule } from './acesso/acesso.module';
import { AuthModule } from './auth/auth.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DatabaseModule } from './database/database.module';
import { EmprrestimosModule } from './emprestimos/emprestimos.module';
import { FinancasModule } from './financas/financas.module';
import { UserModule } from './user/user.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [AuthModule, DatabaseModule, AcessoModule, UserModule, WhatsAppModule, FinancasModule, EmprrestimosModule],
  providers: [AllExceptionsFilter],
})
export class AppModule {}
