import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { WhatsAppModule } from 'src/whatsapp/whatsapp.module';
import { FinancasController } from './financas.controller';
import { FinancasService } from './financas.service';
import { NotificationService } from './notification.service';

@Module({
  imports: [DatabaseModule, AuthModule, WhatsAppModule],
  controllers: [FinancasController],
  providers: [FinancasService, NotificationService],
  exports: [FinancasService],
})
export class FinancasModule {}

