import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseCategoryEnum } from 'generated/prisma';
import { PrismaService } from 'src/database/prisma.service';
import {
    ClassifyTransactionDto,
    CreateExpenseCategoryDto,
    CreateTransactionDto,
} from './dto';

@Injectable()
export class FinancasService {
  constructor(private prisma: PrismaService) {}

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
    },
  ) {
    const where: any = { userId };

    if (filters?.startDate && filters?.endDate) {
      where.date = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.isClassified !== undefined) {
      where.isClassified = filters.isClassified;
    }

    return this.prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
    });
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

    // Validate linked loans if provided
    if (dto.linkedLoanIds && dto.linkedLoanIds.length > 0) {
      for (const loanId of dto.linkedLoanIds) {
        const loan = await this.prisma.loan.findUnique({
          where: { idLoan: loanId },
        });
        if (!loan || loan.userId !== userId) {
          throw new NotFoundException('Empréstimo não encontrado');
        }
        if (!loan.isPaid) {
          throw new BadRequestException('Apenas empréstimos pagos podem ser linkados');
        }
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

    // Link paid loans to this transaction
    if (dto.linkedLoanIds && dto.linkedLoanIds.length > 0) {
      await this.prisma.$transaction(
        dto.linkedLoanIds.map((loanId) =>
          this.prisma.loan.update({
            where: { idLoan: loanId },
            data: {
              paymentTransactionId: transactionId,
            },
          })
        )
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
                  categoryId: dto.categoryId,
                  transactionId: transactionId,
                  dueDate: item.dueDate,
                  description: item.description ?? `Parcela de empréstimo relacionada à transação: ${transaction.description}`,
                  notes: item.notes ?? transaction.notes,
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

    return this.prisma.transaction.delete({
      where: { idTransaction: id },
    });
  }

  async getPaidLoans(userId: string) {
    return this.prisma.loan.findMany({
      where: {
        userId,
        isPaid: true,
      },
      include: {
        category: true,
      },
      orderBy: { paidDate: 'desc' },
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
    const where: any = { userId };

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
}
