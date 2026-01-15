import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateLoanBatchDto, CreateLoanDto, CreateLoanFromTransactionDto, PayRecurringInterestDto, UpdateLoanDto } from './dto';
import { calculateExpectedProfit, calculateMonthsDuration, calculateTotalInterestEarned } from './utils/interest-calculator';

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
        createdAt: dto.createdAt || new Date(),
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
      dto.items.map((item) => {
        // Calcular lucro previsto se houver taxa de juros
        let expectedProfit: number | undefined;
        if (item.interestRate && item.interestRate > 0) {
          const createdDate = item.createdAt || new Date();
          const dueDate = new Date(item.dueDate);
          const months = calculateMonthsDuration(createdDate, dueDate);
          expectedProfit = calculateExpectedProfit(
            item.amount,
            item.interestRate,
            item.interestType || 'SIMPLE',
            item.periodRule || 'MENSAL',
            months,
          );
        }

        return this.prisma.loan.create({
          data: {
            userId,
            borrowerName: dto.borrowerName,
            amount: item.amount,
            categoryId: item.categoryId,
            transactionId: dto.transactionId,
            dueDate: item.dueDate,
            description: item.description,
            notes: item.notes,
            interestRate: item.interestRate,
            interestType: item.interestType,
            periodRule: item.periodRule,
            marketReference: item.marketReference,
            expectedProfit: expectedProfit,
            isRecurringInterest: item.isRecurringInterest || false,
            recurringInterestDay: item.recurringInterestDay,
            createdAt: item.createdAt || new Date(),
          },
          include: { category: true },
        });
      })
    );

    return created;
  }

  async getLoans(userId: string, filters?: { isPaid?: boolean }) {
    const where: any = { userId };

    if (filters?.isPaid !== undefined) {
      where.isPaid = filters.isPaid;
    }

    const loans = await this.prisma.loan.findMany({
      where,
      include: {
        category: true,
        payments: {
          include: {
            transaction: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        recurringPayments: {
          orderBy: { referenceMonth: 'asc' },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Calcular total pago e saldo pendente para cada empréstimo
    return loans.map((loan) => {
      const totalPaid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const remainingBalance = loan.amount - totalPaid;
      
      // Calcular juros recorrentes pagos
      const recurringInterestPaid = loan.recurringPayments
        .filter(rp => rp.isPaid)
        .reduce((sum, rp) => sum + rp.amount, 0);
      
      // Calcular juros recorrentes pendentes
      const recurringInterestPending = loan.recurringPayments
        .filter(rp => !rp.isPaid)
        .reduce((sum, rp) => sum + rp.amount, 0);

      return {
        ...loan,
        totalPaid,
        remainingBalance,
        recurringInterestPaid,
        recurringInterestPending,
      };
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
      include: {
        payments: true,
      },
    });

    // Calcula saldo pendente por empréstimo considerando pagamentos
    const loansWithBalance = loans.map((loan) => {
      const paid = loan.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
      const remaining = Math.max(loan.amount - paid, 0);
      return { loan, paid, remaining };
    });

    const totalLoaned = loansWithBalance
      .filter(({ loan }) => !loan.isPaid)
      .reduce((sum, { remaining }) => sum + remaining, 0);

    const totalPaid = loansWithBalance
      .filter(({ loan }) => loan.isPaid)
      .reduce((sum, { paid }) => sum + paid, 0);

    // Empréstimos marcados como pagos mas sem vínculos de pagamento suficientes
    // (sem registros em LoanPayment ou com soma de pagamentos menor que o valor do empréstimo)
    const unlinkedLoans = loansWithBalance.filter(({ loan, paid }) => loan.isPaid && paid < loan.amount);
    const unlinkedAmount = unlinkedLoans.reduce((sum, { remaining, loan, paid }) => {
      const missing = Math.max(loan.amount - paid, 0);
      return sum + missing;
    }, 0);
    const unlinkedCount = unlinkedLoans.length;

    const now = new Date();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
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
        payments: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    const overdueAmount = overdueLoans.reduce((sum, l) => {
      const paid = l.payments?.reduce((pSum, p) => pSum + p.amount, 0) ?? 0;
      return sum + Math.max(l.amount - paid, 0);
    }, 0);
    const overdueCount = overdueLoans.length;

    const upcomingPayments = await this.prisma.loan.findMany({
      where: {
        userId,
        isPaid: false,
        dueDate: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        category: true,
        payments: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    const upcomingAmount7Days = upcomingPayments.reduce((sum, l) => {
      const paid = l.payments?.reduce((pSum, p) => pSum + p.amount, 0) ?? 0;
      return sum + Math.max(l.amount - paid, 0);
    }, 0);

    // Agrupar por categoria (somente empréstimos pendentes)
    const loansWithCategory = await this.prisma.loan.findMany({
      where: { userId, isPaid: false },
      include: {
        category: true,
        payments: true,
      },
    });

    const byCategory: Record<string, number> = {};
    for (const loan of loansWithCategory) {
      const categoryName = loan.category?.name || 'Sem categoria';
      const paid = loan.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
      const remaining = Math.max(loan.amount - paid, 0);
      byCategory[categoryName] = (byCategory[categoryName] || 0) + remaining;
    }

    // Calcular rendimentos de juros
    const interestEarnings = calculateTotalInterestEarned(loans);

    return {
      totalLoaned,
      totalPaid,
      totalLoans: loans.length,
      paidLoans: loans.filter(l => l.isPaid).length,
      overdueLoans,
      upcomingPayments,
      overdueAmount,
      overdueCount,
      upcomingAmount7Days,
      unlinkedAmount,
      unlinkedCount,
      byCategory,
      interestEarnings,
    };
  }

  async getInterestEarnings(userId: string) {
    const loans = await this.prisma.loan.findMany({
      where: { userId },
      include: { 
        payments: true,
        recurringPayments: true,
      },
    });

    const basicEarnings = calculateTotalInterestEarned(loans);
    
    // Calcular juros recorrentes
    const recurringInterestPaid = loans.reduce((total, loan) => {
      const paidRecurring = loan.recurringPayments
        .filter(rp => rp.isPaid)
        .reduce((sum, rp) => sum + rp.amount, 0);
      return total + paidRecurring;
    }, 0);

    const recurringInterestPending = loans.reduce((total, loan) => {
      const pendingRecurring = loan.recurringPayments
        .filter(rp => !rp.isPaid)
        .reduce((sum, rp) => sum + rp.amount, 0);
      return total + pendingRecurring;
    }, 0);

    return {
      ...basicEarnings,
      recurringInterestPaid,
      recurringInterestPending,
      totalRecurringInterest: recurringInterestPaid + recurringInterestPending,
    };
  }

  // Calcular o valor do juros mensal para um empréstimo com juros recorrentes
  calculateMonthlyInterest(loan: { amount: number; interestRate: number; periodRule?: string }): number {
    const rate = loan.interestRate;
    const monthlyRate = loan.periodRule === 'ANUAL' ? rate / 12 : rate;
    return loan.amount * (monthlyRate / 100);
  }

  // Gerar parcelas de juros recorrentes para um empréstimo
  async generateRecurringInterestPayments(loanId: string, userId: string, monthsAhead: number = 1) {
    const loan = await this.getLoanById(loanId, userId);
    
    if (!loan.isRecurringInterest || !loan.interestRate) {
      throw new BadRequestException('Este empréstimo não possui juros recorrentes configurados');
    }

    const monthlyInterest = this.calculateMonthlyInterest({
      amount: loan.amount,
      interestRate: loan.interestRate,
      periodRule: loan.periodRule || 'MENSAL',
    });

    const now = new Date();
    const createdPayments:any = [];

    for (let i = 0; i <= monthsAhead; i++) {
      const referenceMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
      
      // Verificar se já existe pagamento para este mês
      const existing = await this.prisma.recurringInterestPayment.findUnique({
        where: {
          loanId_referenceMonth: {
            loanId,
            referenceMonth,
          },
        },
      });

      if (!existing) {
        const payment = await this.prisma.recurringInterestPayment.create({
          data: {
            loanId,
            referenceMonth,
            amount: Math.round(monthlyInterest * 100) / 100,
            isPaid: false,
          },
        });
        createdPayments.push(payment);
      }
    }

    return createdPayments;
  }

  // Registrar pagamento de juros recorrentes
  async payRecurringInterest(userId: string, dto: PayRecurringInterestDto) {
    const loan = await this.getLoanById(dto.loanId, userId);

    // Verificar se a parcela existe
    const referenceMonth = new Date(dto.referenceMonth);
    referenceMonth.setDate(1);
    referenceMonth.setHours(0, 0, 0, 0);

    let payment = await this.prisma.recurringInterestPayment.findUnique({
      where: {
        loanId_referenceMonth: {
          loanId: dto.loanId,
          referenceMonth,
        },
      },
    });

    // Se não existir, criar
    if (!payment) {
      const monthlyInterest = this.calculateMonthlyInterest({
        amount: loan.amount,
        interestRate: loan.interestRate || 0,
        periodRule: loan.periodRule || 'MENSAL',
      });

      payment = await this.prisma.recurringInterestPayment.create({
        data: {
          loanId: dto.loanId,
          referenceMonth,
          amount: dto.amount || Math.round(monthlyInterest * 100) / 100,
          isPaid: true,
          paidDate: new Date(),
          transactionId: dto.transactionId,
          notes: dto.notes,
        },
      });
    } else {
      // Atualizar pagamento existente
      payment = await this.prisma.recurringInterestPayment.update({
        where: { idPayment: payment.idPayment },
        data: {
          amount: dto.amount || payment.amount,
          isPaid: true,
          paidDate: new Date(),
          transactionId: dto.transactionId,
          notes: dto.notes,
        },
      });
    }

    return payment;
  }

  // Reverter pagamento de juros recorrentes
  async reverseRecurringInterestPayment(paymentId: string, userId: string) {
    const payment = await this.prisma.recurringInterestPayment.findUnique({
      where: { idPayment: paymentId },
      include: { loan: true },
    });

    if (!payment || payment.loan.userId !== userId) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    return this.prisma.recurringInterestPayment.update({
      where: { idPayment: paymentId },
      data: {
        isPaid: false,
        paidDate: null,
        transactionId: null,
      },
    });
  }

  // Obter parcelas de juros recorrentes pendentes
  async getPendingRecurringInterest(userId: string) {
    const loans = await this.prisma.loan.findMany({
      where: {
        userId,
        isRecurringInterest: true,
        isPaid: false,
      },
      include: {
        recurringPayments: {
          where: { isPaid: false },
          orderBy: { referenceMonth: 'asc' },
        },
      },
    });

    // Gerar parcelas pendentes para o mês atual se não existirem
    for (const loan of loans) {
      await this.generateRecurringInterestPayments(loan.idLoan, userId, 0);
    }

    // Re-buscar com parcelas atualizadas
    return this.prisma.loan.findMany({
      where: {
        userId,
        isRecurringInterest: true,
        isPaid: false,
      },
      include: {
        category: true,
        recurringPayments: {
          where: { isPaid: false },
          orderBy: { referenceMonth: 'asc' },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  // Resumo de juros recorrentes por mês (para gráfico)
  async getRecurringInterestSummary(userId: string, monthsBack: number = 12) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);

    const payments = await this.prisma.recurringInterestPayment.findMany({
      where: {
        loan: { userId },
        referenceMonth: { gte: startDate },
      },
      include: {
        loan: {
          select: { borrowerName: true, idLoan: true },
        },
      },
      orderBy: { referenceMonth: 'asc' },
    });

    // Agrupar por mês
    const byMonth: Record<string, { paid: number; pending: number; details: any[] }> = {};

    for (const payment of payments) {
      const monthKey = `${payment.referenceMonth.getFullYear()}-${String(payment.referenceMonth.getMonth() + 1).padStart(2, '0')}`;
      
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { paid: 0, pending: 0, details: [] };
      }

      if (payment.isPaid) {
        byMonth[monthKey].paid += payment.amount;
      } else {
        byMonth[monthKey].pending += payment.amount;
      }

      byMonth[monthKey].details.push({
        loanId: payment.loan.idLoan,
        borrowerName: payment.loan.borrowerName,
        amount: payment.amount,
        isPaid: payment.isPaid,
        paidDate: payment.paidDate,
      });
    }

    return byMonth;
  }
}
