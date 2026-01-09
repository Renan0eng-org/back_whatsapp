import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { WhatsAppWebService } from './whatsapp-web.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppGateway } from './whatsapp.gateway';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [HttpModule, DatabaseModule, AuthModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppWebService, WhatsAppGateway],
  exports: [WhatsAppService, WhatsAppWebService, WhatsAppGateway],
})
export class WhatsAppModule {}
