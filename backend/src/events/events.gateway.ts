import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      client.join(`user_${userId}`);
      this.logger.log(`Client bağlandı: ${client.id}, Kullanıcı Odası: user_${userId}`);
    } else {
      this.logger.log(`Client anonim bağlandı: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ayrıldı: ${client.id}`);
  }

  @SubscribeMessage('join_user_room')
  handleJoinUserRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    if (data?.userId) {
      client.join(`user_${data.userId}`);
      this.logger.log(`Kullanıcı odasına katıldı: user_${data.userId} (socket ${client.id})`);
      return { status: 'joined', room: `user_${data.userId}` };
    }
  }

  /**
   * Belirli bir kullanıcıya event gönderir
   */
  notifyUser(userId: string, event: string, payload: any) {
    if (this.server) {
      this.server.to(`user_${userId}`).emit(event, payload);
      this.logger.log(`Kullanıcıya bildirim gönderildi: user_${userId}, Event: ${event}`);
    }
  }

  /**
   * Tüm bağlı istemcilere veya tüm satış yöneticilerine event yayar
   */
  broadcast(event: string, payload: any) {
    if (this.server) {
      this.server.emit(event, payload);
    }
  }

  /**
   * Yeni lead ataması bildirimi
   */
  notifyNewLeadsAssigned(repId: string, leadCount: number, leads: any[]) {
    this.notifyUser(repId, 'new_leads_assigned', {
      message: `Size ${leadCount} adet yeni potansiyel müşteri (lead) atandı.`,
      count: leadCount,
      leads,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Teklif durum değişikliği bildirimi
   */
  notifyQuoteStatusChanged(repId: string, quoteNumber: string, status: string, reason?: string) {
    this.notifyUser(repId, 'quote_status_changed', {
      quoteNumber,
      status,
      reason,
      message: `${quoteNumber} numaralı teklif durumu '${status}' olarak güncellendi.`,
      timestamp: new Date().toISOString(),
    });
  }
}
