import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/auth/get-user.decorator';
import { Menu } from 'src/auth/menu.decorator';
import { RefreshTokenGuard } from 'src/auth/refresh-token.guard';
import { CreateLoanBatchDto, CreateLoanDto, CreateLoanFromTransactionDto, PayRecurringInterestDto, UpdateLoanDto } from './dto';
import { EmprrestimosService } from './emprestimos.service';

@Controller('emprestimos')
@Menu('')
@UseGuards(RefreshTokenGuard)
export class EmprrestimosController {
  constructor(private emprrestimosService: EmprrestimosService) {}

  @Post()
  async createLoan(@GetUser() user: any, @Body() dto: CreateLoanDto) {
    return this.emprrestimosService.createLoan(user.idUser, dto);
  }

  @Post('from-transaction')
  async createLoanFromTransaction(
    @GetUser() user: any,
    @Body() dto: CreateLoanFromTransactionDto,
  ) {
    return this.emprrestimosService.createLoanFromTransaction(user.idUser, dto);
  }

  @Post('batch')
  async createLoanBatch(
    @GetUser() user: any,
    @Body() dto: CreateLoanBatchDto,
  ) {
    return this.emprrestimosService.createLoanBatch(user.idUser, dto);
  }

  @Get()
  async getLoans(
    @GetUser() user: any,
    @Query('isPaid') isPaid?: string,
  ) {
    const filters = {
      isPaid: isPaid === 'true' ? true : isPaid === 'false' ? false : undefined,
    };
    return this.emprrestimosService.getLoans(user.idUser, filters);
  }

  @Get('earnings/summary')
  async getInterestEarnings(@GetUser() user: any) {
    return this.emprrestimosService.getInterestEarnings(user.idUser);
  }

  @Get('summary')
  async getLoansSummary(@GetUser() user: any) {
    return this.emprrestimosService.getLoansSummary(user.idUser);
  }

  @Get(':id')
  async getLoanById(@GetUser() user: any, @Param('id') id: string) {
    return this.emprrestimosService.getLoanById(id, user.idUser);
  }

  @Put(':id')
  async updateLoan(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateLoanDto,
  ) {
    return this.emprrestimosService.updateLoan(id, user.idUser, dto);
  }

  @Put(':id/mark-as-paid')
  async markAsPaid(@GetUser() user: any, @Param('id') id: string) {
    return this.emprrestimosService.markAsPaid(id, user.idUser);
  }

  @Put(':id/reverse-payment')
  async reversePayment(@GetUser() user: any, @Param('id') id: string) {
    return this.emprrestimosService.reversePayment(id, user.idUser);
  }

  @Delete(':id')
  async deleteLoan(@GetUser() user: any, @Param('id') id: string) {
    return this.emprrestimosService.deleteLoan(id, user.idUser);
  }

  // ============ JUROS RECORRENTES ============

  @Get('recurring-interest/pending')
  async getPendingRecurringInterest(@GetUser() user: any) {
    return this.emprrestimosService.getPendingRecurringInterest(user.idUser);
  }

  @Get('recurring-interest/summary')
  async getRecurringInterestSummary(
    @GetUser() user: any,
    @Query('monthsBack') monthsBack?: string,
  ) {
    const months = monthsBack ? parseInt(monthsBack, 10) : 12;
    return this.emprrestimosService.getRecurringInterestSummary(user.idUser, months);
  }

  @Post(':id/recurring-interest/generate')
  async generateRecurringInterest(
    @GetUser() user: any,
    @Param('id') id: string,
    @Query('monthsAhead') monthsAhead?: string,
  ) {
    const months = monthsAhead ? parseInt(monthsAhead, 10) : 1;
    return this.emprrestimosService.generateRecurringInterestPayments(id, user.idUser, months);
  }

  @Post('recurring-interest/pay')
  async payRecurringInterest(
    @GetUser() user: any,
    @Body() dto: PayRecurringInterestDto,
  ) {
    return this.emprrestimosService.payRecurringInterest(user.idUser, dto);
  }

  @Put('recurring-interest/:paymentId/reverse')
  async reverseRecurringInterestPayment(
    @GetUser() user: any,
    @Param('paymentId') paymentId: string,
  ) {
    return this.emprrestimosService.reverseRecurringInterestPayment(paymentId, user.idUser);
  }
}
