import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { FinancasController } from './financas.controller';
import { FinancasService } from './financas.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [FinancasController],
  providers: [FinancasService],
  exports: [FinancasService],
})
export class FinancasModule {}

