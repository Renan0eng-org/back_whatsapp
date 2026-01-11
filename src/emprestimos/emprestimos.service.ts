import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateLoanBatchDto, CreateLoanDto, CreateLoanFromTransactionDto, UpdateLoanDto } from './dto';

@Injectable()
export class EmprrestimosService {
  constructor(private prisma: PrismaService) {}

  async createLoan(userId: string, dto: CreateLoanDto) {
    // Validar que a categoria pertence ao usuário ou é padrão
    const category = await this.prisma.expenseCategory.findUnique({
      where: { idCategory: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    if (category.userId && category.userId !== userId) {
      throw new BadRequestException('Categoria não disponível');
    }

    return this.prisma.loan.create({
      data: {
        ...dto,
        userId,
      },
      include: {
        category: true,
      },
    });
  }

  async createLoanFromTransaction(
    userId: string,
    dto: CreateLoanFromTransactionDto,
  ) {
    // Verificar se a transação existe e pertence ao usuário
    const transaction = await this.prisma.transaction.findUnique({
      where: { idTransaction: dto.transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }

    if (transaction.userId !== userId) {
      throw new NotFoundException('Transação não encontrada');
    }

    // Usar categoria da transação se disponível
    const categoryId = transaction.categoryId;
    if (!categoryId) {
      throw new BadRequestException(
        'Transação precisa estar classificada em uma categoria',
      );
    }

    // Validar categoria
    const category = await this.prisma.expenseCategory.findUnique({
      where: { idCategory: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    // Criar empréstimo com dados da transação
    return this.prisma.loan.create({
      data: {
        userId,
        borrowerName: dto.borrowerName || transaction.description,
        amount: transaction.value,
        categoryId,
        transactionId: dto.transactionId,
        dueDate: dto.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias por padrão
        description: `Empréstimo relacionado à transação: ${transaction.description}`,
        notes: dto.notes || transaction.notes,
      },
      include: {
        category: true,
      },
    });
  }

  async createLoanBatch(userId: string, dto: CreateLoanBatchDto) {
    // Validate transaction if provided
    if (dto.transactionId) {
      const transaction = await this.prisma.transaction.findUnique({
        where: { idTransaction: dto.transactionId },
      });
      if (!transaction || transaction.userId !== userId) {
        throw new NotFoundException('Transação não encontrada');
      }
    }

    // Validate categories
    for (const item of dto.items) {
      const category = await this.prisma.expenseCategory.findUnique({
        where: { idCategory: item.categoryId },
      });
      if (!category) throw new NotFoundException('Categoria não encontrada');
      if (category.userId && category.userId !== userId) {
        throw new BadRequestException('Categoria não disponível');
      }
    }

    const created = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.loan.create({
          data: {
            userId,
            borrowerName: dto.borrowerName,
            amount: item.amount,
            categoryId: item.categoryId,
            transactionId: dto.transactionId,
            dueDate: item.dueDate,
            description: item.description,
            notes: item.notes,
          },
          include: { category: true },
        })
      )
    );

    return created;
  }

  async getLoans(userId: string, filters?: { isPaid?: boolean }) {
    const where: any = { userId };

    if (filters?.isPaid !== undefined) {
      where.isPaid = filters.isPaid;
    }

    return this.prisma.loan.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getLoanById(id: string, userId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { idLoan: id },
      include: {
        category: true,
      },
    });

    if (!loan) {
      throw new NotFoundException('Empréstimo não encontrado');
    }

    if (loan.userId !== userId) {
      throw new NotFoundException('Empréstimo não encontrado');
    }

    return loan;
  }

  async updateLoan(id: string, userId: string, dto: UpdateLoanDto) {
    const loan = await this.getLoanById(id, userId);

    // Se está mudando categoria, validar
    if (dto.categoryId) {
      const category = await this.prisma.expenseCategory.findUnique({
        where: { idCategory: dto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Categoria não encontrada');
      }

      if (category.userId && category.userId !== userId) {
        throw new BadRequestException('Categoria não disponível');
      }
    }

    return this.prisma.loan.update({
      where: { idLoan: id },
      data: dto,
      include: {
        category: true,
      },
    });
  }

  async markAsPaid(id: string, userId: string) {
    const loan = await this.getLoanById(id, userId);
    return this.prisma.loan.update({
      where: { idLoan: id },
      data: {
        isPaid: true,
        paidDate: new Date(),
      },
      include: {
        category: true,
      },
    });
  }

  async reversePayment(id: string, userId: string) {
    const loan = await this.getLoanById(id, userId);
    return this.prisma.loan.update({
      where: { idLoan: id },
      data: {
        isPaid: false,
        paidDate: null,
      },
      include: {
        category: true,
      },
    });
  }

  async deleteLoan(id: string, userId: string) {
    const loan = await this.getLoanById(id, userId);
    return this.prisma.loan.delete({
      where: { idLoan: id },
    });
  }

  async getLoansSummary(userId: string) {
    const loans = await this.prisma.loan.findMany({
      where: { userId },
    });

    const totalLoaned = loans
      .filter(l => !l.isPaid)
      .reduce((sum, l) => sum + l.amount, 0);

    const totalPaid = loans
      .filter(l => l.isPaid)
      .reduce((sum, l) => sum + l.amount, 0);

    const now = new Date();
    
    const overdueLoans = await this.prisma.loan.findMany({
      where: {
        userId,
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

    const upcomingPayments = await this.prisma.loan.findMany({
      where: {
        userId,
        isPaid: false,
        dueDate: {
          gte: now,
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        category: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    return {
      totalLoaned,
      totalPaid,
      totalLoans: loans.length,
      paidLoans: loans.filter(l => l.isPaid).length,
      overdueLoans,
      upcomingPayments,
    };
  }
}
