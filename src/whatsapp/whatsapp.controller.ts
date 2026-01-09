import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Menu } from 'src/auth/menu.decorator';
import { AuthService } from '../auth/auth.service';
import { CreateWhatsAppConfigDto, CreateWhatsAppWebSessionDto, SendMessageDto, UpdateWhatsAppConfigDto } from './dto';
import { WhatsAppWebService } from './whatsapp-web.service';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
@Menu('')
export class WhatsAppController {
  constructor(
    private whatsappService: WhatsAppService,
    private whatsappWebService: WhatsAppWebService,
    private authService: AuthService,
  ) {}

  private async getUserIdFromToken(@Req() request: Request): Promise<string> {
    // Ordem de preferência: Authorization header > cookie
    let token: string | null = null;

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      token = request.cookies['refresh_token'];
    }

    if (!token) {
      throw new UnauthorizedException('Token não fornecido');
    }

    try {
      const dataToken = await this.authService.validateToken(token, { type: 'refresh' });
      return dataToken.dataToken.sub;
    } catch (error) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  // Configuração
  @Post('config')
  @HttpCode(HttpStatus.CREATED)
  async createConfig(
    @Req() request: Request,
    @Body() createConfigDto: CreateWhatsAppConfigDto,
  ) {
    const userId = await this.getUserIdFromToken(request);
    return this.whatsappService.createConfig(userId, createConfigDto);
  }

  @Get('config/:id')
  async getConfig(@Param('id') configId: string) {
    return this.whatsappService.getConfig(configId);
  }

  @Get('configs')
  async getConfigs(@Req() request: Request) {
    const userId = await this.getUserIdFromToken(request);
    return this.whatsappService.getConfigsByUser(userId);
  }

  @Put('config/:id')
  async updateConfig(
    @Param('id') configId: string,
    @Body() updateConfigDto: UpdateWhatsAppConfigDto,
  ) {
    return this.whatsappService.updateConfig(configId, updateConfigDto);
  }

  @Delete('config/:id')
  async deleteConfig(@Param('id') configId: string) {
    return this.whatsappService.deleteConfig(configId);
  }

  // Mensagens
  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Query('configId') configId: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.whatsappService.sendMessage(configId, sendMessageDto);
  }

  @Get('messages')
  async getMessages(
    @Query('configId') configId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    return this.whatsappService.getMessages(
      configId,
      parseInt(limit),
      parseInt(offset),
    );
  }

  @Get('messages/:phone')
  async getMessagesByPhone(
    @Query('configId') configId: string,
    @Param('phone') phoneNumber: string,
  ) {
    return this.whatsappService.getMessagesByPhone(configId, phoneNumber);
  }

  // ========== WhatsApp Web Sessions ==========

  @Post('web/session')
  @HttpCode(HttpStatus.CREATED)
  async createWebSession(
    @Req() request: Request,
    @Body() createSessionDto: CreateWhatsAppWebSessionDto,
  ) {
    const userId = await this.getUserIdFromToken(request);
    return this.whatsappWebService.createSession(
      userId,
      createSessionDto.sessionName,
      createSessionDto.displayName,
    );
  }

  @Get('web/sessions')
  async getWebSessions(@Req() request: Request) {
    const userId = await this.getUserIdFromToken(request);
    return this.whatsappWebService.getSessions(userId);
  }

  @Get('web/session/:id')
  async getWebSession(@Param('id') sessionId: string) {
    return this.whatsappWebService.getSession(sessionId);
  }

  @Delete('web/session/:id')
  async deleteWebSession(@Param('id') sessionId: string) {
    return this.whatsappWebService.deleteSession(sessionId);
  }

  @Post('web/send')
  @HttpCode(HttpStatus.CREATED)
  async sendWebMessage(
    @Query('sessionId') sessionId: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.whatsappWebService.sendMessageWeb(
      sessionId,
      sendMessageDto.phoneNumber,
      sendMessageDto.message,
    );
  }

  @Get('web/conversations')
  async getWebConversations(
    @Query('sessionId') sessionId: string,
    @Query('limit') limit: string = '10',
  ) {
    return this.whatsappWebService.getConversations(sessionId, parseInt(limit));
  }
  
  @Get('web/contact/:phone/profile-pic')
  async getContactProfilePic(
    @Query('sessionId') sessionId: string,
    @Param('phone') phoneNumber: string,
  ) {
    return this.whatsappWebService.getContactProfilePic(sessionId, phoneNumber);
  }

  @Get('web/messages/:phone')
  async getWebMessagesByContact(
    @Query('sessionId') sessionId: string,
    @Param('phone') phoneNumber: string,
    @Query('limit') limit: string = '10',
    @Query('offset') offset: string = '0',
  ) {
    return this.whatsappWebService.getMessagesByContact(
      sessionId, 
      phoneNumber,
      parseInt(limit),
      parseInt(offset),
    );
  }

  @Put('web/session/:id/webhook')
  async updateWebhookConfig(
    @Param('id') sessionId: string,
    @Body() body: { webhookUrl: string; webhookEnabled: boolean },
  ) {
    return this.whatsappWebService.updateWebhookConfig(
      sessionId,
      body.webhookUrl,
      body.webhookEnabled,
    );
  }

  // Webhook (sem autenticação)
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    return this.whatsappService.handleWebhook(body);
  }

  @Get('webhook')
  @HttpCode(HttpStatus.OK)
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') token: string,
  ) {
    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      return challenge;
    }
    return { error: 'Invalid token' };
  }
}
