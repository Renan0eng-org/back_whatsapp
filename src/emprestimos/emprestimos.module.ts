import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { EmprrestimosController } from './emprestimos.controller';
import { EmprrestimosService } from './emprestimos.service';

@Module({
  controllers: [EmprrestimosController],
  providers: [EmprrestimosService],
  imports: [AuthModule, DatabaseModule],
})
export class EmprrestimosModule {}
