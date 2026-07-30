import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

type SocketAuthData = { user?: AuthUser };

type AuthedSocket = Omit<Socket, 'data'> & {
  data: SocketAuthData;
};

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: true, credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  /** userId -> set of socket ids */
  private online = new Map<string, Set<string>>();

  constructor(
    private jwt: JwtService,
    private chat: ChatService,
  ) {}

  private setOnline(userId: string, socketId: string) {
    const sockets = this.online.get(userId) || new Set<string>();
    const wasOffline = sockets.size === 0;
    sockets.add(socketId);
    this.online.set(userId, sockets);
    if (wasOffline) {
      this.server.emit('presenceUpdate', { userId, online: true });
    }
  }

  private setOffline(userId: string, socketId: string) {
    const sockets = this.online.get(userId);
    if (!sockets) return;
    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.online.delete(userId);
      this.server.emit('presenceUpdate', { userId, online: false });
    } else {
      this.online.set(userId, sockets);
    }
  }

  isOnline(userId: string) {
    return (this.online.get(userId)?.size || 0) > 0;
  }

  async handleConnection(client: AuthedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers.authorization || '').replace('Bearer ', '');
      const payload = this.jwt.verify<{
        sub: string;
        email: string;
        role: string;
      }>(token);
      client.data.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      await client.join(`user_${payload.sub}`);
      this.setOnline(payload.sub, client.id);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthedSocket) {
    const userId = client.data.user?.userId;
    if (userId) this.setOffline(userId, client.id);
  }

  @SubscribeMessage('getPresence')
  getPresence(@MessageBody() body: { userIds?: string[] }) {
    const ids = body?.userIds || [];
    return ids.map((userId) => ({
      userId,
      online: this.isOnline(userId),
    }));
  }

  @SubscribeMessage('joinConversation')
  async joinConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    await this.chat.ensureParticipant(body.conversationId, user.userId);
    await client.join(`conversation_${body.conversationId}`);
    await this.chat.markRead(user.userId, body.conversationId);
    const peerIds = await this.chat.peerIds(body.conversationId, user.userId);
    return {
      ok: true,
      peers: peerIds.map((userId) => ({
        userId,
        online: this.isOnline(userId),
      })),
    };
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string; content: string },
  ) {
    const user = client.data.user;
    if (!user) return;
    const message = await this.chat.sendMessage(
      user,
      body.conversationId,
      body.content,
    );
    this.server
      .to(`conversation_${body.conversationId}`)
      .emit('receiveMessage', message);

    const peerIds = await this.chat.peerIds(body.conversationId, user.userId);
    for (const peerId of peerIds) {
      this.server.to(`user_${peerId}`).emit('inboxUpdate', {
        conversationId: body.conversationId,
        message,
      });
    }
    return message;
  }

  @SubscribeMessage('typing')
  typing(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string; isTyping: boolean },
  ) {
    client.to(`conversation_${body.conversationId}`).emit('userTyping', {
      userId: client.data.user?.userId,
      conversationId: body.conversationId,
      isTyping: body.isTyping,
    });
  }
}
