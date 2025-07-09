import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { UseGuards } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.user = payload;

      //join user to their personal room
      client.join(`user_${payload.userId}`);

      console.log(`User ${payload.userId} connected`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`User ${client.data.user?.userId} disconnected`);
  }

  @SubscribeMessage('joinConversation')
  async handleJoin(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) return;

    //verify user has access to this conversation
    const conversation = await this.chatService.getConversation(
      data.conversationId,
    );
    if (!conversation) return;

    if (
      conversation.patientId !== user.userId &&
      conversation.adminId !== user.userId
    ) {
      return;
    }

    client.join(data.conversationId);
    console.log(
      `User ${user.userId} joined conversation ${data.conversationId}`,
    );
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody()
    data: {
      conversationId: string;
      content: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) return;

    //verify user has access to this conversation
    const conversation = await this.chatService.getConversation(
      data.conversationId,
    );
    if (!conversation) return;

    if (
      conversation.patientId !== user.userId &&
      conversation.adminId !== user.userId
    ) {
      return;
    }

    const sender = user.role === 'admin' ? 'admin' : 'patient';

    const msg = await this.chatService.sendMessage(
      data.conversationId,
      sender,
      user.userId,
      data.content,
    );

    //Emit to all users in the conversation
    this.server.to(data.conversationId).emit('receiveMessage', {
      id: msg.id,
      content: msg.content,
      sender: msg.sender,
      senderId: msg.senderId,
      createdAt: msg.createdAt,
      conversationId: msg.conversation.id,
    });
    return msg;
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { conversationId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) return;

    client.to(data.conversationId).emit('userTyping', {
      userId: user.userId,
      isTyping: data.isTyping,
    });
  }
}
