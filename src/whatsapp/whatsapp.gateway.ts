import { Injectable } from '@nestjs/common';
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/whatsapp',
})
export class WhatsAppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private sessionClients = new Map<string, Set<string>>(); // sessionId -> Set<socketId>

  handleConnection(client: Socket) {
    console.log(`Cliente WebSocket conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente WebSocket desconectado: ${client.id}`);
    
    // Remove o cliente de todas as sessões
    for (const [sessionId, clients] of this.sessionClients.entries()) {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.sessionClients.delete(sessionId);
      }
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { sessionId: string }) {
    const { sessionId } = payload;
    
    if (!this.sessionClients.has(sessionId)) {
      this.sessionClients.set(sessionId, new Set());
    }
    
    this.sessionClients.get(sessionId)!.add(client.id);
    client.join(`session:${sessionId}`);
    
    console.log(`✅ Cliente ${client.id} inscrito na sessão ${sessionId}`);
    console.log(`📊 Total de clientes na sessão ${sessionId}: ${this.sessionClients.get(sessionId)!.size}`);
    
    return { success: true, message: `Inscrito na sessão ${sessionId}` };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, payload: { sessionId: string }) {
    const { sessionId } = payload;
    
    if (this.sessionClients.has(sessionId)) {
      this.sessionClients.get(sessionId)!.delete(client.id);
    }
    
    client.leave(`session:${sessionId}`);
    
    return { success: true, message: `Desinscrito da sessão ${sessionId}` };
  }

  // Método para enviar nova mensagem para os clientes
  emitNewMessage(sessionId: string, message: any) {
    console.log(`📤 Emitindo new_message para sessão ${sessionId}:`, message);
    const clientsCount = this.sessionClients.get(sessionId)?.size || 0;
    console.log(`👥 Clientes inscritos na sessão ${sessionId}: ${clientsCount}`);
    this.server.to(`session:${sessionId}`).emit('new_message', message);
  }

  // Método para atualizar status de mensagem
  emitMessageStatus(sessionId: string, messageId: string, status: string) {
    this.server.to(`session:${sessionId}`).emit('message_status', {
      messageId,
      status,
    });
  }

  // Método para notificar atualização em conversa
  emitConversationUpdate(sessionId: string, conversation: any) {
    console.log(`📤 Emitindo conversation_update para sessão ${sessionId}:`, conversation);
    this.server.to(`session:${sessionId}`).emit('conversation_update', conversation);
  }
}
