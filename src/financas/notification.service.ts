import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from 'src/database/prisma.service';
import { WhatsAppWebService } from 'src/whatsapp/whatsapp-web.service';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private readonly TARGET_PHONE = '5544991571020@c.us'; // Formato WhatsApp Web

  constructor(
    private prisma: PrismaService,
    private whatsappWebService: WhatsAppWebService,
  ) {}

  onModuleInit() {
    // Agendar para rodar todos os dias às 7h da manhã
    cron.schedule('0 7 * * *', () => {
      this.logger.log('Executando verificação de gastos vencendo...');
      this.checkDueExpenses();
    });

    // teste cron a cada minuto
    // cron.schedule('*/1 * * * *', () => {
    //   this.logger.log('Executando verificação de gastos vencendo...');
    //   this.checkDueExpenses();
    // });

    this.logger.log('Sistema de notificações de gastos iniciado');
  }

  private async checkDueExpenses() {
    try {
      // Buscar todas as sessões ativas do WhatsApp
      const sessions = await this.prisma.whatsAppWebSession.findMany({
        where: {
          status: 'CONNECTED',
        },
      });

      if (sessions.length === 0) {
        this.logger.warn('Nenhuma sessão WhatsApp ativa encontrada');
        return;
      }

      // Usar a primeira sessão ativa
      const session = sessions[0];

      // Buscar gastos vencendo hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const expensesDueToday = await this.prisma.recurringExpense.findMany({
        where: {
          isActive: true,
          isPaid: false,
          dueDate: {
            gte: today,
            lt: tomorrow,
          },
        },
        select: {
          idRecurringExpense: true,
          name: true,
          companyName: true,
          amount: true,
          dueDate: true,
          qrCode: true,
          category: { select: { name: true } },
        },
      });

      // Buscar gastos atrasados
      const overdueExpenses = await this.prisma.recurringExpense.findMany({
        where: {
          isActive: true,
          isPaid: false,
          dueDate: {
            lt: today,
          },
        },
        select: {
          idRecurringExpense: true,
          name: true,
          companyName: true,
          amount: true,
          dueDate: true,
          qrCode: true,
          category: { select: { name: true } },
        },
      });

      if (expensesDueToday.length === 0 && overdueExpenses.length === 0) {
        this.logger.log('Nenhum gasto vencendo ou atrasado hoje');
        return;
      }

      // Montar mensagem
      let message = '🔔 *Resumo de Gastos* 🔔\n\n';

      if (overdueExpenses.length > 0) {
        
        message += `⚠️ *GASTOS ATRASADOS (${overdueExpenses.length}):*\n\n`;
        overdueExpenses.forEach((expense) => {
          const daysLate = Math.floor(
            (today.getTime() - new Date(expense.dueDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          message += `❌ *${expense.name}*\n`;
          if (expense.companyName) message += `   Empresa: ${expense.companyName}\n`;
          message += `   Valor: R$ ${expense.amount.toFixed(2)}\n`;
          message += `   Vencimento: ${new Date(expense.dueDate).toLocaleDateString('pt-BR')}\n`;
          message += `   *${daysLate} dia(s) atrasado*\n`;
          if (expense.category) message += `   Categoria: ${expense.category.name}\n`;
          if (expense.qrCode) message += `   📱 Código de pagamento disponível:\n${expense.qrCode}\n`;
          message += '\n';
        });
      }

      if (expensesDueToday.length > 0) {
        message += `📅 *VENCENDO HOJE (${expensesDueToday.length}):*\n\n`;
        expensesDueToday.forEach((expense) => {
          message += `⏰ *${expense.name}*\n`;
          if (expense.companyName) message += `   Empresa: ${expense.companyName}\n`;
          message += `   Valor: R$ ${expense.amount.toFixed(2)}\n`;
          if (expense.category) message += `   Categoria: ${expense.category.name}\n`;
          if (expense.qrCode) message += `   📱 Código de pagamento disponível\n`;
          message += '\n';
        });
      }

      const total = overdueExpenses.reduce((sum, e) => sum + e.amount, 0) +
                    expensesDueToday.reduce((sum, e) => sum + e.amount, 0);
      message += `💰 *Total: R$ ${total.toFixed(2)}*`;

      // Enviar mensagem com retry em caso de erro
      try {
        await this.whatsappWebService.sendMessageWeb(
          session.idSession,
          this.TARGET_PHONE,
          message,
        );

        this.logger.log(`Notificação enviada com sucesso: ${expensesDueToday.length} vencendo, ${overdueExpenses.length} atrasados`);
      } catch (sendError) {
        this.logger.error('Erro ao enviar mensagem WhatsApp:', sendError.message);
        
        // Tentar novamente com o número sem formatação
        try {
          const phoneWithoutFormat = '5544991571020';
          await this.whatsappWebService.sendMessageWeb(
            session.idSession,
            phoneWithoutFormat,
            message,
          );
          this.logger.log('Notificação enviada com sucesso na segunda tentativa');
        } catch (retryError) {
          this.logger.error('Falha ao enviar notificação após retry:', retryError.message);
          throw retryError;
        }
      }
    } catch (error) {
      this.logger.error('Erro ao verificar gastos:', error);
      throw error;
    }
  }

  // Método para teste manual
  async sendTestNotification() {
    await this.checkDueExpenses();
    return { success: true, message: 'Verificação manual executada' };
  }
}
