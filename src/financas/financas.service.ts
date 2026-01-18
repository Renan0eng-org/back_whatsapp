import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseCategoryEnum } from 'generated/prisma';
import { PrismaService } from 'src/database/prisma.service';
import {
    ClassifyTransactionDto,
    CreateExpenseCategoryDto,
    CreateRecurringExpenseDto,
    CreateTransactionDto,
    MarkExpenseAsPaidDto,
    UpdateRecurringExpenseDto,
} from './dto';

@Injectable()
export class FinancasService {
  constructor(private prisma: PrismaService) { }

  // ===== EXPENSE CATEGORIES =====

  async createCategory(userId: string, dto: CreateExpenseCategoryDto) {
    return this.prisma.expenseCategory.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async getCategories(userId: string) {
    return this.prisma.expenseCategory.findMany({
      where: {
        OR: [{ userId }, { userId: null }], // Retorna categorias do usuário + padrões
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCategoryById(id: string, userId: string) {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { idCategory: id },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    if (category.userId && category.userId !== userId) {
      throw new BadRequestException('Acesso negado a esta categoria');
    }

    return category;
  }

  async updateCategory(id: string, userId: string, dto: CreateExpenseCategoryDto) {
    const category = await this.getCategoryById(id, userId);

    if (category.userId !== userId) {
      throw new BadRequestException('Você pode editar apenas suas categorias');
    }

    return this.prisma.expenseCategory.update({
      where: { idCategory: id },
      data: dto,
    });
  }

  async deleteCategory(id: string, userId: string) {
    const category = await this.getCategoryById(id, userId);

    if (category.userId !== userId) {
      throw new BadRequestException('Você pode deletar apenas suas categorias');
    }

    return this.prisma.expenseCategory.delete({
      where: { idCategory: id },
    });
  }

  // ===== TRANSACTIONS =====

  async createTransaction(userId: string, dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        ...dto,
        date: new Date(dto.date),
        userId,
      },
      include: { category: true },
    });
  }

  async getTransactions(
    userId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      categoryId?: string;
      isClassified?: boolean;
      search?: string;
      minValue?: number;
      maxValue?: number;
      type?: string; // income | expense | all
    },
  ) {
    const where: any = { userId, deletedAt: null };

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.isClassified !== undefined) {
      where.isClassified = filters.isClassified;
    }

    if (filters?.minValue !== undefined || filters?.maxValue !== undefined) {
      where.value = where.value || {};
      if (filters.minValue !== undefined) where.value.gte = filters.minValue;
      if (filters.maxValue !== undefined) where.value.lte = filters.maxValue;
    }

    if (filters?.type === 'income') {
      where.value = { ...(where.value || {}), gt: 0 };
    } else if (filters?.type === 'expense') {
      where.value = { ...(where.value || {}), lt: 0 };
    }

    if (filters?.search) {
      const term = filters.search;
      where.OR = [
        { description: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
        { externalId: { contains: term, mode: 'insensitive' } },
        { aiSuggestion: { contains: term, mode: 'insensitive' } },
      ];
    }

    return this.prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
    });
  }

  async unclassifyTransaction(transactionId: string, userId: string) {
    // Ensure transaction belongs to user
    await this.getTransactionById(transactionId, userId);

    // Remove vínculos de pagamento com empréstimos
    await this.prisma.loanPayment.deleteMany({
      where: { transactionId: transactionId },
    });

    // Reset classificação e categoria
    const updated = await this.prisma.transaction.update({
      where: { idTransaction: transactionId },
      data: {
        categoryId: null,
        isClassified: false,
        notes: null,
      },
      include: { category: true },
    });

    return updated;
  }
  async getTransactionById(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { idTransaction: id },
      include: { category: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }

    if (transaction.userId !== userId) {
      throw new BadRequestException('Acesso negado a esta transação');
    }

    return transaction;
  }

  async classifyTransaction(
    transactionId: string,
    userId: string,
    dto: ClassifyTransactionDto,
  ) {
    const transaction = await this.getTransactionById(transactionId, userId);

    // Validate that the category belongs to the user or is a default category
    const category = await this.prisma.expenseCategory.findUnique({
      where: { idCategory: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    if (category.userId && category.userId !== userId) {
      throw new BadRequestException('Categoria não disponível');
    }

    // Validate loan payments if provided
    if (dto.loanPayments && dto.loanPayments.length > 0) {
      // Validar que o total dos pagamentos não excede o valor da transação
      const totalPayments = dto.loanPayments.reduce((sum, p) => sum + p.amount, 0);
      // Valida o lavor negativo 
      const negativeTransaction = transaction.value * -1;
      if (totalPayments > transaction.value && totalPayments > negativeTransaction) {
        throw new BadRequestException(
          `Total de pagamentos (${totalPayments}) não pode exceder o valor da transação (${transaction.value})`
        );
      }

    }

    const updatedTransaction = await this.prisma.transaction.update({
      where: { idTransaction: transactionId },
      data: {
        categoryId: dto.categoryId,
        isClassified: true,
        notes: dto.notes,
      },
      include: { category: true },
    });

    // Create loan payments records if provided
    if (dto.loanPayments && dto.loanPayments.length > 0) {
      await this.prisma.$transaction(
        dto.loanPayments.map((payment) => {
          if (payment.loanId) {
            return this.prisma.loan.update({
              where: { idLoan: payment.loanId },
              data: {
                transactionId: transactionId,
              },
            });
          }

          return this.prisma.loanPayment.create({
            data: {
              loanId: payment.loanId,
              transactionId: transactionId,
              amount: payment.amount,
              notes: payment.notes,
            },
          });
        })
      );
    }


    // Se marcado para criar empréstimo, criar automaticamente
    if (dto.createLoan) {
      try {
        if (dto.loanItems && dto.loanItems.length > 0) {
          // Criar múltiplas parcelas vinculadas à mesma transação
          await this.prisma.$transaction(
            dto.loanItems.map((item) =>
              this.prisma.loan.create({
                data: {
                  userId,
                  borrowerName: dto.borrowerName || transaction.description,
                  amount: item.amount,
                  categoryId: item.categoryId,
                  transactionId: transactionId,
                  dueDate: item.dueDate,
                  description: item.description ?? `Parcela de empréstimo relacionada à transação: ${transaction.description}`,
                  notes: item.notes ?? transaction.notes,
                  interestRate: item.interestRate,
                  interestType: item.interestType,
                  periodRule: item.periodRule,
                  expectedProfit: item.expectedProfit,
                  isRecurringInterest: item.isRecurringInterest ?? false,
                  recurringInterestDay: item.recurringInterestDay,
                  createdAt: item.createdAt ?? new Date(),
                },
              })
            )
          );
        } else {
          // Única parcela padrão (valor total)
          await this.prisma.loan.create({
            data: {
              userId,
              borrowerName: dto.borrowerName || transaction.description,
              amount: transaction.value,
              categoryId: dto.categoryId,
              transactionId: transactionId,
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias por padrão
              description: `Empréstimo relacionado à transação: ${transaction.description}`,
              notes: dto.notes || transaction.notes,
            },
          });
        }
      } catch (error) {
        // Log error but don't fail the classification
        console.error('Erro ao criar empréstimo automaticamente:', error);
      }
    }

    return updatedTransaction;
  }

  async deleteTransaction(id: string, userId: string) {
    await this.getTransactionById(id, userId);

    return this.prisma.transaction.update({
      where: { idTransaction: id },
      data: { deletedAt: new Date() },
    });
  }

  // ===== TRASH (LIXEIRA) =====

  async getDeletedTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: { not: null },
      },
      include: { category: true },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async restoreTransaction(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { idTransaction: id },
      include: { category: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }

    if (transaction.userId !== userId) {
      throw new BadRequestException('Acesso negado a esta transação');
    }

    if (!transaction.deletedAt) {
      throw new BadRequestException('Transação não está na lixeira');
    }

    return this.prisma.transaction.update({
      where: { idTransaction: id },
      data: { deletedAt: null },
      include: { category: true },
    });
  }

  async permanentDeleteTransaction(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { idTransaction: id },
    });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }

    if (transaction.userId !== userId) {
      throw new BadRequestException('Acesso negado a esta transação');
    }

    if (!transaction.deletedAt) {
      throw new BadRequestException('Transação deve estar na lixeira para ser excluída permanentemente');
    }

    // Remover vínculos de pagamento com empréstimos
    await this.prisma.loanPayment.deleteMany({
      where: { transactionId: id },
    });

    return this.prisma.transaction.delete({
      where: { idTransaction: id },
    });
  }

  async getPaidLoans(userId: string) {
    const loans = await this.prisma.loan.findMany({
      where: {
        userId,
        isPaid: true,
      },
      include: {
        category: true,
        payments: {
          orderBy: { createdAt: 'asc' },
          include: {
            transaction: true,
          },
        },
      },
      orderBy: { paidDate: 'desc' },
    });

    // Calcular saldo pendente de cada empréstimo
    return loans.map((loan) => {
      const totalPaid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const remainingBalance = loan.amount - totalPaid;

      return {
        ...loan,
        totalPaid,
        remainingBalance,
      };
    });
  }

  // ===== CSV IMPORT =====

  async importTransactionsFromCsv(userId: string, fileContent: string) {
    const lines = fileContent
      .split('\n')
      .filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      throw new BadRequestException('Arquivo CSV vazio ou inválido');
    }

    const headers = lines[0]
      .split(',')
      .map((h) => h.trim().toLowerCase());

    const dataIndex = {
      data: headers.indexOf('data'),
      valor: headers.indexOf('valor'),
      identificador: headers.indexOf('identificador'),
      descrição: headers.indexOf('descrição'),
    };

    if (
      dataIndex.data === -1 ||
      dataIndex.valor === -1 ||
      dataIndex.descrição === -1
    ) {
      throw new BadRequestException(
        'Arquivo CSV deve conter as colunas: Data, Valor, Descrição',
      );
    }

    const transactions: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');

      const dateStr = parts[dataIndex.data]?.trim();
      const valorStr = parts[dataIndex.valor]?.trim();
      const descricao = parts[dataIndex.descrição]?.trim();
      const externalId = parts[dataIndex.identificador]?.trim();

      if (!dateStr || !valorStr || !descricao) continue;

      // Parse date in format DD/MM/YYYY
      const [day, month, year] = dateStr.split('/');
      if (!day || !month || !year) continue;

      const date = new Date(`${year}-${month}-${day}`);
      if (isNaN(date.getTime())) continue;

      const valor = parseFloat(valorStr);
      if (isNaN(valor)) continue;

      // Check if transaction already exists
      if (externalId) {
        const existing = await this.prisma.transaction.findUnique({
          where: { externalId },
        });

        if (existing) continue; // Skip if already imported
      }

      transactions.push({
        date,
        value: valor,
        description: descricao,
        externalId: externalId || null,
        userId,
        isClassified: false,
        metadata: { imported_at: new Date().toISOString() },
      });
    }

    if (transactions.length === 0) {
      throw new BadRequestException(
        'Nenhuma transação válida foi encontrada no arquivo',
      );
    }

    // Batch insert
    const result = await this.prisma.transaction.createMany({
      data: transactions,
    });

    return {
      success: true,
      imported: result.count,
      message: `${result.count} transação(ões) importada(s) com sucesso`,
    };
  }

  // ===== STATISTICS =====

  async getFinancialSummary(
    userId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = { userId, deletedAt: null };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: { category: true },
    });

    const income = transactions
      .filter((t) => t.value > 0)
      .reduce((sum, t) => sum + t.value, 0);

    const expenses = transactions
      .filter((t) => t.value < 0)
      .reduce((sum, t) => sum + Math.abs(t.value), 0);

    const byCategory = {};
    transactions
      .filter((t) => t.value < 0)
      .forEach((t) => {
        const categoryName = t.category?.name || 'Não classificado';
        byCategory[categoryName] = (byCategory[categoryName] || 0) + Math.abs(t.value);
      });

    return {
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses,
      byCategory,
      totalTransactions: transactions.length,
      classifiedCount: transactions.filter((t) => t.isClassified).length,
      unclassifiedCount: transactions.filter((t) => !t.isClassified).length,
    };
  }

  // ===== SERIES FOR CHART =====

  async getFinancialSeries(
    userId: string,
    startDate: string,
    endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch all transactions in range
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });

    // Fetch all loans for this user with their payments
    const loans = await this.prisma.loan.findMany({
      where: { userId },
      include: {
        payments: true,
      },
    });

    // Build day-by-day map
    const dayMap: Record<string, { income: number; expenses: number; balance: number; unpaid: number }> = {};

    // Initialize with zero
    const current = new Date(start);
    while (current <= end) {
      const key = current.toISOString().slice(0, 10);
      dayMap[key] = { income: 0, expenses: 0, balance: 0, unpaid: 0 };
      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Compute baseline balance before start date (transactions before start)
    const transactionsBefore = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { lt: start },
      },
    });
    let baseBalance = transactionsBefore.reduce((acc, t) => acc + t.value, 0);

    // Fill transaction data per day
    let runningBalance = baseBalance;
    for (const dayKey of Object.keys(dayMap).sort()) {
      const dayTrans = transactions.filter((t) => t.date.toISOString().slice(0, 10) === dayKey);
      const dayIncome = dayTrans.filter((t) => t.value > 0).reduce((sum, t) => sum + t.value, 0);
      const dayExpenses = dayTrans.filter((t) => t.value < 0).reduce((sum, t) => sum + Math.abs(t.value), 0);
      runningBalance += dayIncome - dayExpenses;
      dayMap[dayKey].income = dayIncome;
      dayMap[dayKey].expenses = dayExpenses;
      dayMap[dayKey].balance = runningBalance;
    }

    // Calculate unpaid loans outstanding as of each day
    for (const dayKey of Object.keys(dayMap).sort()) {
      const asOfDate = new Date(dayKey + 'T23:59:59Z');
      let unpaidTotal = 0;

      for (const loan of loans) {
        // Only consider loans that existed by this date (dueDate <= asOfDate or createdAt <= asOfDate)
        if (loan.createdAt <= asOfDate) {
          const paidAmount = loan.payments
            .filter((p) => p.createdAt <= asOfDate)
            .reduce((sum, p) => sum + p.amount, 0);
          const outstanding = loan.amount - paidAmount;
          if (outstanding > 0) {
            unpaidTotal += outstanding;
          }
        }
      }
      dayMap[dayKey].unpaid = unpaidTotal;
    }

    // Convert to array
    return Object.keys(dayMap)
      .sort()
      .map((date) => ({
        date,
        income: dayMap[date].income,
        expenses: dayMap[date].expenses,
        balance: dayMap[date].balance,
        unpaid: dayMap[date].unpaid,
      }));
  }

  // ===== SEED DEFAULT CATEGORIES =====

  async seedDefaultCategories() {
    const defaultCategories = [
      {
        name: 'Alimentação',
        type: ExpenseCategoryEnum.ALIMENTACAO,
        color: '#FF6B6B',
        icon: 'utensils',
        description: 'Despesas com comida e bebida',
      },
      {
        name: 'Transporte',
        type: ExpenseCategoryEnum.TRANSPORTE,
        color: '#4ECDC4',
        icon: 'car',
        description: 'Despesas com transporte e combustível',
      },
      {
        name: 'Utilidades',
        type: ExpenseCategoryEnum.UTILIDADES,
        color: '#45B7D1',
        icon: 'home',
        description: 'Despesas com água, luz e gás',
      },
      {
        name: 'Saúde',
        type: ExpenseCategoryEnum.SAUDE,
        color: '#96CEB4',
        icon: 'heart',
        description: 'Despesas médicas e farmacêuticas',
      },
      {
        name: 'Educação',
        type: ExpenseCategoryEnum.EDUCACAO,
        color: '#FFEAA7',
        icon: 'book',
        description: 'Cursos e materiais educativos',
      },
      {
        name: 'Lazer',
        type: ExpenseCategoryEnum.LAZER,
        color: '#DDA0DD',
        icon: 'smile',
        description: 'Entretenimento e hobbies',
      },
      {
        name: 'Telefone/Internet',
        type: ExpenseCategoryEnum.TELEFONE,
        color: '#87CEEB',
        icon: 'phone',
        description: 'Planos de telefone e internet',
      },
      {
        name: 'Seguros',
        type: ExpenseCategoryEnum.SEGUROS,
        color: '#CD5C5C',
        icon: 'shield',
        description: 'Seguros em geral',
      },
      {
        name: 'Impostos',
        type: ExpenseCategoryEnum.IMPOSTOS,
        color: '#708090',
        icon: 'file-text',
        description: 'Impostos e taxas',
      },
      {
        name: 'Renda',
        type: ExpenseCategoryEnum.RENDA,
        color: '#90EE90',
        icon: 'trending-up',
        description: 'Entrada de renda',
      },
      {
        name: 'Investimentos',
        type: ExpenseCategoryEnum.INVESTIMENTOS,
        color: '#FFD700',
        icon: 'trending-up',
        description: 'Investimentos e aplicações',
      },
      {
        name: 'Outras Despesas',
        type: ExpenseCategoryEnum.OUTRAS,
        color: '#808080',
        icon: 'more-horizontal',
        description: 'Outras despesas não categorizadas',
      },
    ];

    for (const category of defaultCategories) {
      await this.prisma.expenseCategory.upsert({
        where: { name: category.name },
        update: {},
        create: category,
      });
    }

    return defaultCategories.length;
  }

  // ===== RECURRING EXPENSES (GASTOS PREVISTOS) =====

  async createRecurringExpense(userId: string, dto: CreateRecurringExpenseDto) {
    // Se for recorrente, criar múltiplos gastos
    if (dto.isRecurring) {
      const expenses: any[] = [];
      const startDate = new Date(dto.dueDate);
      const endDate = dto.recurringEndDate ? new Date(dto.recurringEndDate) : null;
      const registrationDate = dto.registrationDate || new Date();

      // Gerar ID único para o grupo de recorrência
      const recurringGroupId = `recurring_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Limitar a 24 meses (2 anos) se não tiver data final
      const maxMonths = endDate ? 
        Math.min(this.getMonthsDifference(startDate, endDate) + 1, 120) : 12;

      for (let i = 0; i < maxMonths; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        // Se tiver data final e ultrapassou, parar
        if (endDate && dueDate > endDate) {
          break;
        }

        const expense = await this.prisma.recurringExpense.create({
          data: {
            userId,
            name: dto.name,
            description: dto.description,
            companyName: dto.companyName,
            categoryId: dto.categoryId,
            qrCode: dto.qrCode,
            dueDate,
            amount: dto.amount,
            registrationDate,
            recurringGroupId, // Linkar todos do mesmo grupo
            isMainExpense: i === 0, // Primeiro é o principal
          },
          include: {
            category: true,
          },
        });

        expenses.push(expense);
      }

      return expenses[0]; // Retorna o primeiro gasto criado
    }

    // Criar gasto único
    return this.prisma.recurringExpense.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        companyName: dto.companyName,
        categoryId: dto.categoryId,
        qrCode: dto.qrCode,
        dueDate: dto.dueDate,
        amount: dto.amount,
        registrationDate: dto.registrationDate || new Date(),
      },
      include: {
        category: true,
      },
    });
  }

  private getMonthsDifference(startDate: Date, endDate: Date): number {
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
    return months + endDate.getMonth() - startDate.getMonth();
  }

  async getRecurringExpenses(userId: string, filters?: { isActive?: boolean; isPaid?: boolean }) {
    const where: any = { userId };

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.isPaid !== undefined) {
      where.isPaid = filters.isPaid;
    }

    return this.prisma.recurringExpense.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getRecurringExpenseById(id: string, userId: string) {
    const expense = await this.prisma.recurringExpense.findUnique({
      where: { idRecurringExpense: id },
      include: {
        category: true,
      },
    });

    if (!expense) {
      throw new NotFoundException('Gasto previsto não encontrado');
    }

    if (expense.userId !== userId) {
      throw new BadRequestException('Acesso negado a este gasto');
    }

    return expense;
  }

  async updateRecurringExpense(id: string, userId: string, dto: UpdateRecurringExpenseDto) {
    const existingExpense = await this.getRecurringExpenseById(id, userId);

    // Se o gasto faz parte de um grupo recorrente existente
    if (existingExpense.recurringGroupId) {
      // Se está removendo a recorrência (não está marcado como recorrente)
      if (!dto.isRecurring) {
        // Deletar todos os outros do grupo, mantendo apenas o atual
        await this.prisma.recurringExpense.deleteMany({
          where: {
            recurringGroupId: existingExpense.recurringGroupId,
            userId,
            idRecurringExpense: { not: id }, // Não deletar o atual
          },
        });

        // Atualizar o atual removendo do grupo
        return this.prisma.recurringExpense.update({
          where: { idRecurringExpense: id },
          data: {
            name: dto.name,
            description: dto.description,
            companyName: dto.companyName,
            categoryId: dto.categoryId,
            qrCode: dto.qrCode,
            dueDate: dto.dueDate,
            amount: dto.amount,
            isActive: dto.isActive,
            recurringGroupId: null, // Remover do grupo
            isMainExpense: true, // Manter como principal
          },
          include: {
            category: true,
          },
        });
      }

      // Se ainda é recorrente, atualizar todos do grupo (exceto datas de vencimento)
      if (dto.isRecurring) {
        // Atualizar todos os gastos do mesmo grupo com os mesmos dados (exceto dueDate)
        await this.prisma.recurringExpense.updateMany({
          where: {
            recurringGroupId: existingExpense.recurringGroupId,
            userId,
            idRecurringExpense: { not: id }, // Não atualizar o atual ainda
          },
          data: {
            name: dto.name !== undefined ? dto.name : undefined,
            description: dto.description !== undefined ? dto.description : undefined,
            companyName: dto.companyName !== undefined ? dto.companyName : undefined,
            categoryId: dto.categoryId !== undefined ? dto.categoryId : undefined,
            qrCode: dto.qrCode !== undefined ? dto.qrCode : undefined,
            amount: dto.amount !== undefined ? dto.amount : undefined,
            isActive: dto.isActive !== undefined ? dto.isActive : undefined,
          },
        });

        // Atualizar o gasto atual
        return this.prisma.recurringExpense.update({
          where: { idRecurringExpense: id },
          data: {
            name: dto.name,
            description: dto.description,
            companyName: dto.companyName,
            categoryId: dto.categoryId,
            qrCode: dto.qrCode,
            dueDate: dto.dueDate,
            amount: dto.amount,
            isActive: dto.isActive,
          },
          include: {
            category: true,
          },
        });
      }
    }

    // Se está marcando um gasto comum como recorrente pela primeira vez
    if (dto.isRecurring && dto.dueDate && !existingExpense.recurringGroupId) {
      const startDate = new Date(dto.dueDate);
      const endDate = dto.recurringEndDate ? new Date(dto.recurringEndDate) : null;
      const maxMonths = endDate ? 
        Math.min(this.getMonthsDifference(startDate, endDate) + 1, 120) : 12;

      // Gerar ID único para o grupo de recorrência
      const recurringGroupId = `recurring_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Criar gastos recorrentes futuros baseados na data de vencimento atualizada
      for (let i = 1; i < maxMonths; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        if (endDate && dueDate > endDate) {
          break;
        }

        await this.prisma.recurringExpense.create({
          data: {
            userId,
            name: dto.name || existingExpense.name,
            description: dto.description !== undefined ? dto.description : existingExpense.description,
            companyName: dto.companyName !== undefined ? dto.companyName : existingExpense.companyName,
            categoryId: dto.categoryId !== undefined ? dto.categoryId : existingExpense.categoryId,
            qrCode: dto.qrCode !== undefined ? dto.qrCode : existingExpense.qrCode,
            dueDate,
            amount: dto.amount !== undefined ? dto.amount : existingExpense.amount,
            registrationDate: existingExpense.registrationDate,
            recurringGroupId,
            isMainExpense: false,
          },
        });
      }

      // Atualizar o gasto original para fazer parte do grupo
      return this.prisma.recurringExpense.update({
        where: { idRecurringExpense: id },
        data: {
          name: dto.name,
          description: dto.description,
          companyName: dto.companyName,
          categoryId: dto.categoryId,
          qrCode: dto.qrCode,
          dueDate: dto.dueDate,
          amount: dto.amount,
          isActive: dto.isActive,
          recurringGroupId,
          isMainExpense: true,
        },
        include: {
          category: true,
        },
      });
    }

    // Atualização normal (sem recorrência)
    return this.prisma.recurringExpense.update({
      where: { idRecurringExpense: id },
      data: {
        name: dto.name,
        description: dto.description,
        companyName: dto.companyName,
        categoryId: dto.categoryId,
        qrCode: dto.qrCode,
        dueDate: dto.dueDate,
        amount: dto.amount,
        isActive: dto.isActive,
      },
      include: {
        category: true,
      },
    });
  }

  async deleteRecurringExpense(id: string, userId: string) {
    await this.getRecurringExpenseById(id, userId);

    return this.prisma.recurringExpense.delete({
      where: { idRecurringExpense: id },
    });
  }

  async deleteRecurringExpenseGroup(id: string, userId: string) {
    const expense = await this.getRecurringExpenseById(id, userId);
    
    if (!expense.recurringGroupId) {
      // Se não tem grupo, deleta apenas o individual
      return this.deleteRecurringExpense(id, userId);
    }

    // Deletar todos os gastos do mesmo grupo recorrente
    const deletedCount = await this.prisma.recurringExpense.deleteMany({
      where: {
        recurringGroupId: expense.recurringGroupId,
        userId,
      },
    });

    return { deletedCount: deletedCount.count };
  }

  async getRecurringExpenseGroup(id: string, userId: string) {
    const expense = await this.getRecurringExpenseById(id, userId);
    
    if (!expense.recurringGroupId) {
      return [expense]; // Retorna apenas ele mesmo se não tem grupo
    }

    // Buscar todos os gastos do mesmo grupo
    return this.prisma.recurringExpense.findMany({
      where: {
        recurringGroupId: expense.recurringGroupId,
        userId,
      },
      include: {
        category: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async markExpenseAsPaid(id: string, userId: string, dto: MarkExpenseAsPaidDto) {
    await this.getRecurringExpenseById(id, userId);

    return this.prisma.recurringExpense.update({
      where: { idRecurringExpense: id },
      data: {
        isPaid: true,
        paidDate: dto.paidDate || new Date(),
        transactionId: dto.transactionId,
      },
      include: {
        category: true,
      },
    });
  }

  async getUpcomingExpenses(userId: string, days: number = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return this.prisma.recurringExpense.findMany({
      where: {
        userId,
        isActive: true,
        isPaid: false,
        dueDate: {
          gte: now,
          lte: futureDate,
        },
      },
      include: {
        category: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getOverdueExpenses(userId: string) {
    const now = new Date();

    return this.prisma.recurringExpense.findMany({
      where: {
        userId,
        isActive: true,
        isPaid: false,
        dueDate: {
          lt: now,
        },
      },
      include: {
        category: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }
}
