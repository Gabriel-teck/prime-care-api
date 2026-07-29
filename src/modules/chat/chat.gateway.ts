import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
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
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private jwt: JwtService,
    private chat: ChatService,
  ) {}

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
    } catch {
      client.disconnect();
    }
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
    return message;
  }

  @SubscribeMessage('typing')
  typing(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string; isTyping: boolean },
  ) {
    client.to(`conversation_${body.conversationId}`).emit('userTyping', {
      userId: client.data.user?.userId,
      isTyping: body.isTyping,
    });
  }
}
