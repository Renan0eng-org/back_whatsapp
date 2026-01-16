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
    UploadedFile,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Multer } from 'multer';
import { GetUser } from 'src/auth/get-user.decorator';
import { Menu } from 'src/auth/menu.decorator';
import { RefreshTokenGuard } from 'src/auth/refresh-token.guard';
import {
    ClassifyTransactionDto,
    CreateExpenseCategoryDto,
    CreateTransactionDto,
} from './dto';
import { FinancasService } from './financas.service';

@Controller('financas')
@Menu('')
@UseGuards(RefreshTokenGuard)
export class FinancasController {
  constructor(private financasService: FinancasService) {}

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
    return this.financasService.importTransactionsFromCsv(user.idUser, content);
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
}
