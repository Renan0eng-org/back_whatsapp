import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as qrcode from 'qrcode'
import { Client, LocalAuth } from 'whatsapp-web.js'
import { PrismaService } from '../database/prisma.service'
import { WhatsAppGateway } from './whatsapp.gateway'

@Injectable()
export class WhatsAppWebService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppWebService.name)
  private sessions: Map<string, Client> = new Map()
  private startingSessions: Set<string> = new Set()
  private qrResolvers = new Map<string, (qr: string) => void>()

  constructor(
    private prisma: PrismaService,
    private whatsappGateway: WhatsAppGateway,
  ) { }

  async onModuleInit() {
    this.logger.log('Verificando sessões conectadas no banco de dados...')

    try {
      const connectedSessions = await this.prisma.whatsAppWebSession.findMany({
        where: { status: 'CONNECTED' },
      })

      this.logger.log(`Encontradas ${connectedSessions.length} sessões conectadas`)

      for (const session of connectedSessions) {
        this.logger.log(`Reconectando sessão ${session.sessionName} (${session.idSession})...`)
        try {
          await this.startClient(session.idSession, false)
        } catch (error) {
          this.logger.error(`Erro ao reconectar sessão ${session.idSession}:`, error)
        }
      }
    } catch (error) {
      this.logger.error('Erro ao reconectar sessões:', error)
    }
  }

  async createSession(userId: string, sessionName: string, displayName?: string) {
    this.logger.log(`Criando sessão: ${sessionName} para usuário ${userId}`)

    const existingSession = await this.prisma.whatsAppWebSession.findFirst({
      where: { sessionName, userId },
    })

    if (existingSession) {
      this.logger.warn(`Sessão ${sessionName} já existe`)
      throw new HttpException('Sessão com este nome já existe', HttpStatus.BAD_REQUEST)
    }

    const session = await this.prisma.whatsAppWebSession.create({
      data: {
        userId,
        sessionName,
        displayName: displayName || sessionName,
        status: 'PENDING',
      },
    })

    this.logger.log(`Sessão ${sessionName} criada no banco, ID: ${session.idSession}`)

    try {
      // Aguarda o QR code ser gerado
      this.logger.log(`Aguardando QR code para sessão ${sessionName}...`)
      const qrCode = await this.waitForQR(session.idSession)
      this.logger.log(`QR code gerado com sucesso para sessão ${sessionName}`)

      return { ...session, qrCode }
    } catch (error) {
      this.logger.error(`Erro ao gerar QR code para sessão ${sessionName}:`, error)
      throw new HttpException(
        'Erro ao gerar QR code: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  async getSessions(userId: string) {
    return this.prisma.whatsAppWebSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getSession(sessionId: string) {
    const session = await this.prisma.whatsAppWebSession.findUnique({
      where: { idSession: sessionId },
    })

    if (!session) {
      throw new HttpException('Sessão não encontrada', HttpStatus.NOT_FOUND)
    }

    return session
  }

  async deleteSession(sessionId: string) {
    const session = await this.prisma.whatsAppWebSession.findUnique({
      where: { idSession: sessionId },
    })

    if (!session) {
      throw new HttpException('Sessão não encontrada', HttpStatus.NOT_FOUND)
    }

    const client = this.sessions.get(sessionId)
    if (client) {
      await client.destroy()
      this.sessions.delete(sessionId)
    }

    await fs.rm(
      path.resolve(process.cwd(), '.wwebjs_auth', `session-${sessionId}`),
      { recursive: true, force: true },
    )

    await this.prisma.whatsAppWebSession.delete({
      where: { idSession: sessionId },
    })

    return { message: 'Sessão deletada' }
  }

  async sendMessageWeb(sessionId: string, phoneNumber: string, message: string) {
    // Verifica se a sessão existe no banco
    const session = await this.prisma.whatsAppWebSession.findUnique({
      where: { idSession: sessionId },
    })

    if (!session) {
      throw new HttpException('Sessão não encontrada', HttpStatus.NOT_FOUND)
    }

    // Tenta obter o client do Map ou reconectar se necessário
    let client = this.sessions.get(sessionId)

    if (!client) {
      // Se a sessão está conectada no banco mas não no Map, tenta reconectar
      if (session.status === 'CONNECTED') {
        this.logger.log(`Sessão ${sessionId} está conectada no banco mas não no Map. Reconectando...`)
        try {
          await this.startClient(sessionId)
          // Aguarda um pouco para o cliente inicializar
          await new Promise(resolve => setTimeout(resolve, 5000))
          client = this.sessions.get(sessionId)
        } catch (error) {
          this.logger.error(`Erro ao reconectar sessão ${sessionId}:`, error)
          throw new HttpException('Erro ao reconectar sessão', HttpStatus.INTERNAL_SERVER_ERROR)
        }
      }

      if (!client) {
        throw new HttpException('Sessão não conectada. Por favor, escaneie o QR code novamente.', HttpStatus.BAD_REQUEST)
      }
    }

    // Sanitiza o número de telefone (remove espaços, hífens, parênteses, sinal de +, etc)
    const sanitizedPhone = phoneNumber.replace(/[\s\-\(\)\+]/g, '')
    const chatId = sanitizedPhone.includes('@') ? sanitizedPhone : `${sanitizedPhone}@c.us`

    try {
      const result = await client.sendMessage(chatId, message)

      const savedMessage = await this.prisma.whatsAppMessage.create({
        data: {
          sessionId,
          phoneNumber: sanitizedPhone,
          messageType: 'TEXT',
          direction: 'OUTBOUND',
          status: 'SENT',
          content: message,
          externalId: result.id.id,
        },
      })

      // Emite mensagem enviada via WebSocket
      this.whatsappGateway.emitNewMessage(sessionId, {
        id: savedMessage.idMessage,
        phoneNumber: savedMessage.phoneNumber,
        contactName: savedMessage.contactName,
        messageType: savedMessage.messageType,
        direction: savedMessage.direction,
        status: savedMessage.status,
        content: savedMessage.content,
        mediaUrl: savedMessage.mediaUrl,
        createdAt: savedMessage.createdAt.toISOString(),
      })

      // Atualiza conversa
      this.whatsappGateway.emitConversationUpdate(sessionId, {
        phoneNumber: sanitizedPhone,
        contactName: null,
        lastMessage: message,
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
      })

      return { id: result.id.id, status: 'SENT' }
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem para ${phoneNumber}:`, error)
      throw new HttpException('Erro ao enviar mensagem: ' + error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  private async startClient(sessionId: string, forceNewQR = false) {
    if (this.sessions.has(sessionId) || this.startingSessions.has(sessionId)) {
      this.logger.warn(`Cliente ${sessionId} já existe ou está sendo inicializado`)
      return
    }

    this.startingSessions.add(sessionId)
    this.logger.log(`Iniciando cliente WhatsApp Web para sessão ${sessionId}`)

    try {
      // Só limpa cache se forçar novo QR code
      if (forceNewQR) {
        const cachePath = path.resolve(process.cwd(), '.wwebjs_auth', `session-${sessionId}`)
        try {
          await fs.access(cachePath)
          this.logger.warn(`⚠️ Cache encontrado para sessão ${sessionId}, removendo para forçar QR...`)
          await fs.rm(cachePath, { recursive: true, force: true })
          this.logger.log(`✅ Cache removido para sessão ${sessionId}`)
        } catch {
          this.logger.log(`ℹ️ Nenhum cache encontrado para sessão ${sessionId} (primeira inicialização)`)
        }
      }

      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: sessionId,
          dataPath: path.resolve(process.cwd(), '.wwebjs_auth'),
        }),
        puppeteer: {
          headless: true,
          executablePath: process.env.CHROME_PATH,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
          ],
        },
      });


      this.logger.log(`Cliente criado para sessão ${sessionId}`)
      this.logger.log(`Chrome path: ${process.env.CHROME_PATH || 'padrão do sistema'}`)
      this.sessions.set(sessionId, client)

      client.on('loading_screen', (percent, message) => {
        this.logger.log(`📱 [${sessionId}] Carregando: ${percent}% - ${message}`)
      })

      client.on('authenticated', () => {
        this.logger.log(`🔐 [${sessionId}] Cliente autenticado (cache encontrado)`)
      })

      client.on('qr', async qr => {
        this.logger.log(`QR code recebido para sessão ${sessionId}`)

        try {
          const dataUrl = await qrcode.toDataURL(qr)
          const base64 = dataUrl.split(',')[1]

          await this.prisma.whatsAppWebSession.update({
            where: { idSession: sessionId },
            data: { qrCode: base64, status: 'PENDING' },
          })

          this.logger.log(`QR code salvo no banco para sessão ${sessionId}`)

          // Resolve a promise esperando pelo QR
          const resolver = this.qrResolvers.get(sessionId)
          if (resolver) {
            this.logger.log(`Resolvendo promise do QR code para sessão ${sessionId}`)
            resolver(base64)
            this.qrResolvers.delete(sessionId)
          } else {
            this.logger.warn(`Nenhum resolver encontrado para sessão ${sessionId}`)
          }
        } catch (error) {
          this.logger.error(`Erro ao processar QR code para sessão ${sessionId}:`, error)
        }
      })

      client.on('ready', async () => {
        this.logger.log(`✅ Cliente WhatsApp conectado para sessão ${sessionId}`)

        try {
          await this.prisma.whatsAppWebSession.update({
            where: { idSession: sessionId },
            data: {
              status: 'CONNECTED',
              phoneNumber: client.info?.wid?.user || null,
              qrCode: null,
            },
          })
        } catch (error) {
          this.logger.error(`Erro ao atualizar status CONNECTED para sessão ${sessionId}:`, error)
        }

        // Configura listener para mensagens recebidas
        client.on('message', async (msg) => {
          try {
            // Filtra apenas mensagens de chat normais (não stories, broadcasts, etc)
            if (msg.isStatus || msg.broadcast || msg.from === 'status@broadcast') {
              this.logger.debug(`Ignorando mensagem não-chat: ${msg.from} (isStatus: ${msg.isStatus}, broadcast: ${msg.broadcast})`);
              return;
            }

            // Ignora mensagens de grupos (apenas mensagens diretas)
            if (msg.from.includes('@g.us')) {
              this.logger.debug(`Ignorando mensagem de grupo: ${msg.from}`);
              return;
            }

            this.logger.log(`📨 Nova mensagem recebida na sessão ${sessionId}`);

            // Salva mensagem no banco
            const contact = await msg.getContact();
            const messageData = {
              phoneNumber: msg.from.replace('@c.us', ''),
              contactName: contact.pushname || contact.name || null,
              messageType: this.mapMessageType(msg.type) as any,
              direction: 'INBOUND' as const,
              status: 'DELIVERED' as const,
              content: msg.body || '',
              mediaUrl: msg.hasMedia ? 'pending' : null,
              createdAt: new Date(msg.timestamp * 1000),
            };

            const savedMessage = await this.prisma.whatsAppMessage.create({
              data: {
                ...messageData,
                sessionId,
              },
            });

            // Emite via WebSocket (serializa para JSON)
            this.whatsappGateway.emitNewMessage(sessionId, {
              id: savedMessage.idMessage,
              phoneNumber: savedMessage.phoneNumber,
              contactName: savedMessage.contactName,
              messageType: savedMessage.messageType,
              direction: savedMessage.direction,
              status: savedMessage.status,
              content: savedMessage.content,
              mediaUrl: savedMessage.mediaUrl,
              createdAt: savedMessage.createdAt.toISOString(),
            });

            // Atualiza conversa
            this.whatsappGateway.emitConversationUpdate(sessionId, {
              phoneNumber: messageData.phoneNumber,
              contactName: messageData.contactName,
              lastMessage: messageData.content,
              lastMessageTime: messageData.createdAt.toISOString(),
              unreadCount: 1,
            });

            // Envia para webhook do n8n (se configurado)
            await this.sendToN8nWebhook(sessionId, messageData.phoneNumber, messageData.content);

          } catch (error) {
            this.logger.error(`Erro ao processar mensagem recebida:`, error);
          }
        });
      })

      client.on('disconnected', async () => {
        this.logger.warn(`❌ Cliente WhatsApp desconectado para sessão ${sessionId}`)

        try {
          await this.prisma.whatsAppWebSession.update({
            where: { idSession: sessionId },
            data: { status: 'DISCONNECTED' },
          })
          this.sessions.delete(sessionId)
        } catch (error) {
          this.logger.error(`Erro ao atualizar status DISCONNECTED para sessão ${sessionId}:`, error)
        }
      })

      client.on('auth_failure', async msg => {
        this.logger.error(`❌ Falha de autenticação para sessão ${sessionId}: ${msg}`)

        try {
          await this.prisma.whatsAppWebSession.update({
            where: { idSession: sessionId },
            data: { status: 'DISCONNECTED', qrCode: null },
          })
          this.sessions.delete(sessionId)
        } catch (error) {
          this.logger.error(`Erro ao atualizar após auth_failure para sessão ${sessionId}:`, error)
        }
      })

      this.logger.log(`Inicializando cliente WhatsApp para sessão ${sessionId}...`)
      await client.initialize()
      this.logger.log(`✅ Cliente WhatsApp inicializado com sucesso para sessão ${sessionId}`)
    } catch (error) {
      this.logger.error(`❌ Erro CRÍTICO ao iniciar cliente para sessão ${sessionId}:`, error)
      this.logger.error(`Stack trace:`, error.stack)
      throw error
    } finally {
      this.startingSessions.delete(sessionId)
      this.logger.log(`Sessão ${sessionId} removida de startingSessions`)
    }
  }

  private waitForQR(sessionId: string): Promise<string> {
    this.logger.log(`Configurando espera de QR code para sessão ${sessionId}`)

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.logger.error(`⏱️ TIMEOUT: QR code não gerado em 30 segundos para sessão ${sessionId}`)
        this.qrResolvers.delete(sessionId)
        reject(new Error('Timeout aguardando QR code'))
      }, 30000)

      this.qrResolvers.set(sessionId, (qr: string) => {
        this.logger.log(`QR code recebido via resolver para sessão ${sessionId}`)
        clearTimeout(timeout)
        resolve(qr)
      })

      this.logger.log(`Resolver registrado, iniciando cliente para sessão ${sessionId}`)

      // Inicia o cliente DEPOIS de registrar o resolver - força novo QR
      this.startClient(sessionId, true).catch(err => {
        this.logger.error(`Erro ao iniciar cliente na waitForQR para sessão ${sessionId}:`, err)
        clearTimeout(timeout)
        this.qrResolvers.delete(sessionId)
        reject(err)
      })
    })
  }

  async getConversations(sessionId: string, limit: number = 10) {
    const client = this.sessions.get(sessionId)

    if (!client) {
      // Se não tiver cliente conectado, busca do banco de dados
      return this.getConversationsFromDB(sessionId, limit)
    }

    try {
      this.logger.log(`Buscando ${limit} chats do WhatsApp Web para sessão ${sessionId}`)

      // Verifica se o cliente está realmente pronto
      const state = await client.getState().catch(() => null)
      if (state !== 'CONNECTED') {
        this.logger.warn(`Cliente ${sessionId} não está conectado (estado: ${state}). Buscando do banco...`)
        return this.getConversationsFromDB(sessionId, limit)
      }

      const chats = await client.getChats()

      const conversations = await Promise.all(
        chats
          .filter(chat => !chat.isGroup) // Remove grupos
          .slice(0, limit) // Limita conforme parâmetro
          .map(async chat => {
            try {
              // Pega a última mensagem
              const lastMessage = chat.lastMessage

              // Busca foto de perfil junto
              let profilePicUrl: string | null = null
              try {
                const contact = await chat.getContact()
                const picUrl = await contact.getProfilePicUrl().catch(() => null)
                profilePicUrl = picUrl
              } catch (error) {
                this.logger.warn(`Erro ao buscar foto de perfil para ${chat.id.user}`)
              }

              return {
                phoneNumber: chat.id.user,
                contactName: chat.name || chat.id.user,
                lastMessage: lastMessage?.body || '',
                lastMessageTime: lastMessage?.timestamp
                  ? new Date(lastMessage.timestamp * 1000).toISOString()
                  : new Date().toISOString(),
                unreadCount: chat.unreadCount || 0,
                profilePicUrl,
                isGroup: chat.isGroup,
              }
            } catch (error) {
              this.logger.error(`Erro ao processar chat ${chat.id._serialized}:`, error)
              return null
            }
          })
      )

      // Remove conversas com erro
      const validConversations = conversations.filter(c => c !== null)

      this.logger.log(`Retornando ${validConversations.length} conversas para sessão ${sessionId}`)
      return validConversations
    } catch (error) {
      this.logger.error(`Erro ao buscar conversas do WhatsApp Web:`, error)
      // Fallback para banco de dados
      return this.getConversationsFromDB(sessionId, limit)
    }
  }
  // Mapeia tipos de mensagem do whatsapp-web.js para o enum do Prisma
  private mapMessageType(type: string): string {
    const typeMap: Record<string, string> = {
      'chat': 'TEXT',
      'image': 'IMAGE',
      'video': 'VIDEO',
      'audio': 'AUDIO',
      'ptt': 'AUDIO', // Push-to-talk é áudio
      'document': 'DOCUMENT',
      'sticker': 'IMAGE',
    }
    return typeMap[type.toLowerCase()] || 'TEXT'
  }


  async getContactProfilePic(sessionId: string, phoneNumber: string) {
    const client = this.sessions.get(sessionId)

    if (!client) {
      return null
    }

    try {
      const chatId = `${phoneNumber}@c.us`
      const chat = await client.getChatById(chatId)
      const contact = await chat.getContact()
      const picUrl = await contact.getProfilePicUrl()
      return picUrl || null
    } catch (error) {
      this.logger.warn(`Erro ao buscar foto de perfil para ${phoneNumber}:`, error.message)
      return null
    }
  }

  private async getConversationsFromDB(sessionId: string, limit: number = 10) {
    const messages = await this.prisma.whatsAppMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit * 5, // Pega mais mensagens para agrupar
    })

    // Agrupa mensagens por telefone e pega a última de cada
    const conversationsMap = new Map()

    for (const message of messages) {
      if (!conversationsMap.has(message.phoneNumber)) {
        conversationsMap.set(message.phoneNumber, {
          phoneNumber: message.phoneNumber,
          contactName: message.contactName,
          lastMessage: message.content,
          lastMessageTime: message.createdAt,
          unreadCount: 0,
          profilePicUrl: null,
        })
      }

      if (conversationsMap.size >= limit) break
    }

    return Array.from(conversationsMap.values())
  }

  async getMessagesByContact(sessionId: string, phoneNumber: string, limit: number = 10, offset: number = 0) {
    const client = this.sessions.get(sessionId)
    const sanitizedPhone = phoneNumber.replace(/[\s\-\(\)\+]/g, '')

    if (!client) {
      // Se não tiver cliente, busca do banco
      return this.getMessagesFromDB(sessionId, sanitizedPhone, limit, offset)
    }

    try {
      this.logger.log(`Buscando ${limit} mensagens do WhatsApp Web para ${sanitizedPhone} (offset: ${offset})`)

      const chatId = `${sanitizedPhone}@c.us`
      const chat = await client.getChatById(chatId)

      // Busca mensagens com paginação
      const messages = await chat.fetchMessages({ limit: limit + offset })

      // Aplica offset manualmente
      const paginatedMessages = messages.slice(offset, offset + limit)

      // Mapeia tipos de mensagem para valores válidos do enum
      const mapMessageType = (type: string): string => {
        const typeMap: Record<string, string> = {
          'chat': 'TEXT',
          'image': 'IMAGE',
          'video': 'VIDEO',
          'audio': 'AUDIO',
          'ptt': 'AUDIO', // Push-to-talk é áudio
          'document': 'DOCUMENT',
          'sticker': 'IMAGE',
        }
        return typeMap[type.toLowerCase()] || 'TEXT'
      }

      const formattedMessages = paginatedMessages.map(msg => ({
        id: msg.id.id,
        phoneNumber: sanitizedPhone,
        contactName: chat.name,
        messageType: mapMessageType(msg.type),
        direction: msg.fromMe ? 'OUTBOUND' : 'INBOUND',
        status: msg.ack === 3 ? 'READ' : msg.ack === 2 ? 'DELIVERED' : msg.ack === 1 ? 'SENT' : 'PENDING',
        content: msg.body || '',
        mediaUrl: msg.hasMedia ? 'pending' : null,
        createdAt: new Date(msg.timestamp * 1000).toISOString(),
      }))

      // Salva mensagens no banco de dados para histórico
      for (const msg of formattedMessages) {
        try {
          // Verifica se já existe
          const existing = await this.prisma.whatsAppMessage.findFirst({
            where: { externalId: msg.id },
          })

          if (!existing) {
            await this.prisma.whatsAppMessage.create({
              data: {
                sessionId,
                phoneNumber: sanitizedPhone,
                contactName: msg.contactName,
                messageType: msg.messageType as any,
                direction: msg.direction as any,
                status: msg.status as any,
                content: msg.content,
                externalId: msg.id,
              },
            })
          }
        } catch (error) {
          // Ignora erros de duplicação silenciosamente
          if (!error.message?.includes('Unique constraint') && !error.message?.includes('Invalid value')) {
            this.logger.warn(`Erro ao salvar mensagem ${msg.id}:`, error.message)
          }
        }
      }

      return formattedMessages
    } catch (error) {
      this.logger.error(`Erro ao buscar mensagens do WhatsApp Web:`, error)
      // Fallback para banco de dados
      return this.getMessagesFromDB(sessionId, sanitizedPhone, limit, offset)
    }
  }

  private async getMessagesFromDB(sessionId: string, phoneNumber: string, limit: number = 10, offset: number = 0) {
    const messages = await this.prisma.whatsAppMessage.findMany({
      where: {
        sessionId,
        phoneNumber,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset,
    })

    return messages.map(msg => ({
      id: msg.idMessage,
      phoneNumber: msg.phoneNumber,
      contactName: msg.contactName,
      messageType: msg.messageType,
      direction: msg.direction,
      status: msg.status,
      content: msg.content,
      mediaUrl: msg.mediaUrl,
      createdAt: msg.createdAt.toISOString(),
    }))
  }

  // Envia mensagem recebida para webhook do n8n
  private async sendToN8nWebhook(sessionId: string, phone: string, message: string) {
    try {
      const session = await this.prisma.whatsAppWebSession.findUnique({
        where: { idSession: sessionId },
        select: { webhookUrl: true, webhookEnabled: true },
      });

      if (!session?.webhookEnabled || !session?.webhookUrl) {
        return; // Webhook não configurado ou desabilitado
      }

      this.logger.log(`Enviando mensagem para webhook n8n: ${session.webhookUrl}`);

      const response = await fetch(session.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          message,
          sessionId,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Webhook retornou erro: ${response.status} ${response.statusText}`);
      } else {
        this.logger.log(`Mensagem enviada com sucesso para webhook n8n`);
      }
    } catch (error) {
      this.logger.error(`Erro ao enviar para webhook n8n:`, error);
      // Não lança exceção para não interromper o processamento da mensagem
    }
  }

  async updateWebhookConfig(sessionId: string, webhookUrl: string, webhookEnabled: boolean) {
    const session = await this.prisma.whatsAppWebSession.findUnique({
      where: { idSession: sessionId },
    });

    if (!session) {
      throw new HttpException('Sessão não encontrada', HttpStatus.NOT_FOUND);
    }

    return this.prisma.whatsAppWebSession.update({
      where: { idSession: sessionId },
      data: {
        webhookUrl,
        webhookEnabled,
      },
    });
  }
}

