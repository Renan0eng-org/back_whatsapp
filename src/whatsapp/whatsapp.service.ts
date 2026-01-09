import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../database/prisma.service';
import { CreateWhatsAppConfigDto, SendMessageDto, UpdateWhatsAppConfigDto } from './dto';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly WHATSAPP_API_URL = 'https://graph.instagram.com/v18.0';

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  async createConfig(userId: string, createConfigDto: CreateWhatsAppConfigDto) {
    try {
      // Validar token com WhatsApp API
      await this.validateWhatsAppToken(
        createConfigDto.accessToken,
        createConfigDto.phoneNumberId,
      );

      const config = await this.prisma.whatsAppConfig.create({
        data: {
          userId,
          accessToken: createConfigDto.accessToken,
          phoneNumberId: createConfigDto.phoneNumberId,
          businessAccountId: createConfigDto.businessAccountId,
          displayName: createConfigDto.displayName,
          webhookUrl: createConfigDto.webhookUrl,
          verifyToken: createConfigDto.verifyToken,
        },
      });

      return {
        id: config.idConfig,
        message: 'WhatsApp configuration created successfully',
      };
    } catch (error) {
      this.logger.error('Error creating WhatsApp config', error);
      throw new HttpException(
        error.message || 'Failed to create WhatsApp configuration',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateConfig(configId: string, updateConfigDto: UpdateWhatsAppConfigDto) {
    try {
      // Validar se config existe
      const config = await this.prisma.whatsAppConfig.findUnique({
        where: { idConfig: configId },
      });

      if (!config) {
        throw new HttpException('Configuration not found', HttpStatus.NOT_FOUND);
      }

      // Se token foi atualizado, validar
      if (updateConfigDto.accessToken) {
        await this.validateWhatsAppToken(
          updateConfigDto.accessToken,
          updateConfigDto.phoneNumberId || config.phoneNumberId,
        );
      }

      const updatedConfig = await this.prisma.whatsAppConfig.update({
        where: { idConfig: configId },
        data: updateConfigDto,
      });

      return {
        id: updatedConfig.idConfig,
        message: 'WhatsApp configuration updated successfully',
      };
    } catch (error) {
      this.logger.error('Error updating WhatsApp config', error);
      throw new HttpException(
        error.message || 'Failed to update WhatsApp configuration',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getConfig(configId: string) {
    try {
      const config = await this.prisma.whatsAppConfig.findUnique({
        where: { idConfig: configId },
        select: {
          idConfig: true,
          userId: true,
          phoneNumberId: true,
          businessAccountId: true,
          displayName: true,
          webhookUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!config) {
        throw new HttpException('Configuration not found', HttpStatus.NOT_FOUND);
      }

      return config;
    } catch (error) {
      this.logger.error('Error getting WhatsApp config', error);
      throw new HttpException(
        error.message || 'Failed to get WhatsApp configuration',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getConfigsByUser(userId: string) {
    try {
      const configs = await this.prisma.whatsAppConfig.findMany({
        where: { userId },
        select: {
          idConfig: true,
          phoneNumberId: true,
          businessAccountId: true,
          displayName: true,
          isActive: true,
          createdAt: true,
        },
      });

      return configs;
    } catch (error) {
      this.logger.error('Error getting user WhatsApp configs', error);
      throw new HttpException(
        'Failed to get WhatsApp configurations',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async deleteConfig(configId: string) {
    try {
      const config = await this.prisma.whatsAppConfig.findUnique({
        where: { idConfig: configId },
      });

      if (!config) {
        throw new HttpException('Configuration not found', HttpStatus.NOT_FOUND);
      }

      await this.prisma.whatsAppConfig.delete({
        where: { idConfig: configId },
      });

      return { message: 'WhatsApp configuration deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting WhatsApp config', error);
      throw new HttpException(
        error.message || 'Failed to delete WhatsApp configuration',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async sendMessage(configId: string, sendMessageDto: SendMessageDto) {
    try {
      const config = await this.prisma.whatsAppConfig.findUnique({
        where: { idConfig: configId },
      });

      if (!config) {
        throw new HttpException('Configuration not found', HttpStatus.NOT_FOUND);
      }

      if (!config.isActive) {
        throw new HttpException(
          'WhatsApp configuration is not active',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Construir payload da mensagem
      const messagePayload = this.buildMessagePayload(sendMessageDto);

      // Enviar para WhatsApp API
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.post(
          `${this.WHATSAPP_API_URL}/${config.phoneNumberId}/messages`,
          messagePayload,
          {
            headers: {
              Authorization: `Bearer ${config.accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      // Salvar mensagem no banco
      const message = await this.prisma.whatsAppMessage.create({
        data: {
          configId,
          phoneNumber: sendMessageDto.phoneNumber,
          messageType: sendMessageDto.mediaUrl ? 'DOCUMENT' : 'TEXT',
          direction: 'OUTBOUND',
          status: 'SENT',
          content: sendMessageDto.message,
          mediaUrl: sendMessageDto.mediaUrl,
          caption: sendMessageDto.caption,
          externalId: response.data.messages?.[0]?.id,
          metadata: response.data,
        },
      });

      return {
        id: message.idMessage,
        externalId: response.data.messages?.[0]?.id,
        status: 'SENT',
        message: 'Message sent successfully',
      };
    } catch (error) {
      this.logger.error('Error sending WhatsApp message', error);
      throw new HttpException(
        error.response?.data?.error?.message ||
          error.message ||
          'Failed to send WhatsApp message',
        error.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  async handleWebhook(webhookData: any) {
    try {
      // Verificação de desafio
      if (webhookData['hub.mode'] === 'subscribe') {
        if (webhookData['hub.verify_token'] === process.env.WEBHOOK_VERIFY_TOKEN) {
          return { statusCode: 200, body: webhookData['hub.challenge'] };
        }
        throw new HttpException(
          'Invalid verify token',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Processar mensagens recebidas
      const entry = webhookData.entry?.[0];
      if (!entry) return { statusCode: 200 };

      const changes = entry.changes?.[0];
      if (!changes) return { statusCode: 200 };

      const value = changes.value;
      const metadata = value.metadata;
      const phoneNumberId = metadata?.phone_number_id;

      // Encontrar config pelo phone number
      const config = await this.prisma.whatsAppConfig.findFirst({
        where: { phoneNumberId },
      });

      if (!config) {
        this.logger.warn(`Config not found for phone: ${phoneNumberId}`);
        return { statusCode: 200 };
      }

      // Processar mensagens recebidas
      if (value.messages) {
        for (const msg of value.messages) {
          const contact = value.contacts?.[0];
          await this.prisma.whatsAppMessage.create({
            data: {
              configId: config.idConfig,
              phoneNumber: msg.from,
              contactName: contact?.profile?.name,
              contactWaId: contact?.wa_id,
              messageType: msg.type.toUpperCase() as any,
              direction: 'INBOUND',
              status: 'DELIVERED',
              content: msg.text?.body || '',
              mediaUrl: null,
              externalId: msg.id,
              metadata: msg,
            },
          });
        }
      }

      // Processar atualizações de status
      if (value.statuses) {
        for (const status of value.statuses) {
          await this.prisma.whatsAppMessage.updateMany({
            where: { externalId: status.id },
            data: {
              status: status.status.toUpperCase() as any,
            },
          });
        }
      }

      return { statusCode: 200 };
    } catch (error) {
      this.logger.error('Error handling webhook', error);
      return { statusCode: 200 }; // Retornar 200 para não retentar
    }
  }

  async getMessages(configId: string, limit: number = 50, offset: number = 0) {
    try {
      const config = await this.prisma.whatsAppConfig.findUnique({
        where: { idConfig: configId },
      });

      if (!config) {
        throw new HttpException('Configuration not found', HttpStatus.NOT_FOUND);
      }

      const [messages, total] = await Promise.all([
        this.prisma.whatsAppMessage.findMany({
          where: { configId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.whatsAppMessage.count({
          where: { configId },
        }),
      ]);

      return {
        messages,
        total,
        limit,
        offset,
      };
    } catch (error) {
      this.logger.error('Error getting messages', error);
      throw new HttpException(
        'Failed to get messages',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getMessagesByPhone(configId: string, phoneNumber: string) {
    try {
      const config = await this.prisma.whatsAppConfig.findUnique({
        where: { idConfig: configId },
      });

      if (!config) {
        throw new HttpException('Configuration not found', HttpStatus.NOT_FOUND);
      }

      const messages = await this.prisma.whatsAppMessage.findMany({
        where: {
          configId,
          phoneNumber,
        },
        orderBy: { createdAt: 'desc' },
      });

      return messages;
    } catch (error) {
      this.logger.error('Error getting messages by phone', error);
      throw new HttpException(
        'Failed to get messages',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private buildMessagePayload(sendMessageDto: SendMessageDto) {
    const phoneNumber = sendMessageDto.phoneNumber.replace(/\D/g, '');

    if (sendMessageDto.mediaUrl) {
      return {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: sendMessageDto.mediaType || 'document',
        [sendMessageDto.mediaType || 'document']: {
          link: sendMessageDto.mediaUrl,
          caption: sendMessageDto.caption,
        },
      };
    }

    return {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'text',
      text: {
        body: sendMessageDto.message,
      },
    };
  }

  private async validateWhatsAppToken(token: string, phoneNumberId: string) {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(
          `${this.WHATSAPP_API_URL}/${phoneNumberId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      if (!response.data) {
        throw new Error('Invalid token');
      }
    } catch (error) {
      throw new HttpException(
        'Invalid WhatsApp token or phone number ID',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
