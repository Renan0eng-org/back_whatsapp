import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
  Res,
    UploadedFile,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Multer } from 'multer';
import { Response } from 'express';
import { GetUser } from 'src/auth/get-user.decorator';
import { Menu } from 'src/auth/menu.decorator';
import { RefreshTokenGuard } from 'src/auth/refresh-token.guard';
import {
    ClassifyTransactionDto,
    CreateExpenseCategoryDto,
    CreateRecurringExpenseDto,
    CreateTransactionDto,
    MarkExpenseAsPaidDto,
    UpdateRecurringExpenseDto,
} from './dto';
import { FinancasService } from './financas.service';
import { NotificationService } from './notification.service';

@Controller('financas')
@Menu('')
@UseGuards(RefreshTokenGuard)
export class FinancasController {
  constructor(
    private financasService: FinancasService,
    private notificationService: NotificationService,
  ) {}

  // ===== CATEGORIES =====

  @Post('categories')
  async createCategory(
    @GetUser() user: any,
    @Body() dto: CreateExpenseCategoryDto,
  ) {
    return this.financasService.createCategory(user.idUser, dto);
  }

  @Get('categories')
  async getCategories(@GetUser() user: any) {
    return this.financasService.getCategories(user.idUser);
  }

  @Put('categories/:id')
  async updateCategory(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateExpenseCategoryDto,
  ) {
    return this.financasService.updateCategory(id, user.idUser, dto);
  }

  @Delete('categories/:id')
  async deleteCategory(@GetUser() user: any, @Param('id') id: string) {
    return this.financasService.deleteCategory(id, user.idUser);
  }

  // ===== TRANSACTIONS =====

  @Post('transactions')
  async createTransaction(
    @GetUser() user: any,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.financasService.createTransaction(user.idUser, dto);
  }

  @Get('transactions')
  async getTransactions(
    @GetUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isClassified') isClassified?: string,
    @Query('search') search?: string,
    @Query('minValue') minValue?: string,
    @Query('maxValue') maxValue?: string,
    @Query('type') type?: string,
  ) {
    const filters = {
      startDate,
      endDate,
      categoryId,
      isClassified: isClassified === 'true' ? true : isClassified === 'false' ? false : undefined,
      search,
      minValue: minValue ? parseFloat(minValue) : undefined,
      maxValue: maxValue ? parseFloat(maxValue) : undefined,
      type,
    };

    return this.financasService.getTransactions(user.idUser, filters);
  }

  @Get('transactions/:id')
  async getTransactionById(@GetUser() user: any, @Param('id') id: string) {
    return this.financasService.getTransactionById(id, user.idUser);
  }

  @Put('transactions/:id/classify')
  async classifyTransaction(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: ClassifyTransactionDto,
  ) {
    return this.financasService.classifyTransaction(id, user.idUser, dto);
  }

  @Put('transactions/:id/unclassify')
  async unclassifyTransaction(
    @GetUser() user: any,
    @Param('id') id: string,
  ) {
    return this.financasService.unclassifyTransaction(id, user.idUser);
  }

  @Delete('transactions/:id')
  async deleteTransaction(@GetUser() user: any, @Param('id') id: string) {
    return this.financasService.deleteTransaction(id, user.idUser);
  }

  // ===== TRASH (LIXEIRA) =====

  @Get('trash')
  async getDeletedTransactions(@GetUser() user: any) {
    return this.financasService.getDeletedTransactions(user.idUser);
  }

  @Put('trash/:id/restore')
  async restoreTransaction(@GetUser() user: any, @Param('id') id: string) {
    return this.financasService.restoreTransaction(id, user.idUser);
  }

  @Delete('trash/:id')
  async permanentDeleteTransaction(@GetUser() user: any, @Param('id') id: string) {
    return this.financasService.permanentDeleteTransaction(id, user.idUser);
  }

  // ===== IMPORT CSV =====

  @Post('import-csv')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @GetUser() user: any,
    @UploadedFile() file: Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('O arquivo deve ser um CSV');
    }

    const content = file.buffer.toString('utf-8');
    return this.financasService.importTransactionsFromCsv(user.idUser, {
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      fileContent: content,
    });
  }

  @Get('import-csv/history')
  async getImportHistory(@GetUser() user: any) {
    return this.financasService.getImportHistory(user.idUser);
  }

  @Post('import-csv/:batchId/revert')
  async revertImportBatch(
    @GetUser() user: any,
    @Param('batchId') batchId: string,
  ) {
    return this.financasService.revertImportBatch(user.idUser, batchId);
  }

  @Get('import-csv/:batchId/download')
  async downloadImportedCsv(
    @GetUser() user: any,
    @Param('batchId') batchId: string,
    @Res() response: Response,
  ) {
    const file = await this.financasService.getImportBatchFile(user.idUser, batchId);
    return response.download(file.filePath, file.fileName);
  }

  @Get('import-csv/template')
  async downloadCsvTemplate(@Res() response: Response) {
    const csvTemplate =
      'Data,Valor,Identificador,Descrição\n02/01/2026,320.00,695831c6-4ea5-4464-a13c-75e06e68c9d9,Transferência recebida pelo Pix\n03/01/2026,-46.99,69594085-13ec-4d1a-a0de-4299d4244642,Compra no débito';

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="modelo_importacao_financas.csv"');
    return response.send(csvTemplate);
  }

  // ===== STATISTICS =====

  @Get('paid-loans')
  async getPaidLoans(@GetUser() user: any) {
    return this.financasService.getPaidLoans(user.idUser);
  }

  @Get('summary')
  async getFinancialSummary(
    @GetUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financasService.getFinancialSummary(
      user.idUser,
      startDate,
      endDate,
    );
  }

  @Get('series')
  async getFinancialSeries(
    @GetUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.financasService.getFinancialSeries(
      user.idUser,
      startDate,
      endDate,
    );
  }

  // ===== RECURRING EXPENSES =====

  @Post('recurring-expenses')
  async createRecurringExpense(
    @GetUser() user: any,
    @Body() dto: CreateRecurringExpenseDto,
  ) {
    return this.financasService.createRecurringExpense(user.idUser, dto);
  }

  @Get('recurring-expenses')
  async getRecurringExpenses(
    @GetUser() user: any,
    @Query('isActive') isActive?: string,
    @Query('isPaid') isPaid?: string,
  ) {
    const filters = {
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isPaid: isPaid === 'true' ? true : isPaid === 'false' ? false : undefined,
    };
    return this.financasService.getRecurringExpenses(user.idUser, filters);
  }

  @Get('recurring-expenses/upcoming')
  async getUpcomingExpenses(
    @GetUser() user: any,
    @Query('days') days?: string,
  ) {
    return this.financasService.getUpcomingExpenses(
      user.idUser,
      days ? parseInt(days) : 7,
    );
  }

  @Get('recurring-expenses/overdue')
  async getOverdueExpenses(@GetUser() user: any) {
    return this.financasService.getOverdueExpenses(user.idUser);
  }

  @Get('recurring-expenses/:id')
  async getRecurringExpenseById(
    @GetUser() user: any,
    @Param('id') id: string,
  ) {
    return this.financasService.getRecurringExpenseById(id, user.idUser);
  }

  @Put('recurring-expenses/:id')
  async updateRecurringExpense(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringExpenseDto,
  ) {
    return this.financasService.updateRecurringExpense(id, user.idUser, dto);
  }

  @Delete('recurring-expenses/:id')
  async deleteRecurringExpense(
    @GetUser() user: any,
    @Param('id') id: string,
  ) {
    return this.financasService.deleteRecurringExpense(id, user.idUser);
  }

  @Delete('recurring-expenses/:id/group')
  async deleteRecurringExpenseGroup(
    @GetUser() user: any,
    @Param('id') id: string,
  ) {
    return this.financasService.deleteRecurringExpenseGroup(id, user.idUser);
  }

  @Get('recurring-expenses/:id/group')
  async getRecurringExpenseGroup(
    @GetUser() user: any,
    @Param('id') id: string,
  ) {
    return this.financasService.getRecurringExpenseGroup(id, user.idUser);
  }

  @Put('recurring-expenses/:id/mark-paid')
  async markExpenseAsPaid(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: MarkExpenseAsPaidDto,
  ) {
    return this.financasService.markExpenseAsPaid(id, user.idUser, dto);
  }

  @Post('recurring-expenses/test-notification')
  async testNotification(@GetUser() user: any) {
    return this.notificationService.sendTestNotification();
  }
}
