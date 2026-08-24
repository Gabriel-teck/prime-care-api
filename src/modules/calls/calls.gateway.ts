import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CallsService } from './calls.service';

type SocketAuthData = { user?: AuthUser; callId?: string };

type AuthedSocket = Omit<Socket, 'data'> & {
  data: SocketAuthData;
};

export type SignalingPayload = {
  type: 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to: string;
  data: unknown;
};

@WebSocketGateway({
  namespace: '/calls',
  cors: { origin: true, credentials: true },
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private jwt: JwtService,
    @Inject(forwardRef(() => CallsService))
    private calls: CallsService,
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

  handleDisconnect(client: AuthedSocket) {
    const callId = client.data.callId;
    const userId = client.data.user?.userId;
    if (callId && userId) {
      client.to(`call_${callId}`).emit('peerLeft', { peerId: userId, callId });
    }
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user_${userId}`).emit(event, payload);
  }

  @SubscribeMessage('joinCall')
  async handleJoinCall(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { callId?: string; consultationId?: string },
  ) {
    const user = client.data.user;
    if (!user || !body?.callId || !body?.consultationId) {
      return { ok: false, error: 'Unauthorized or invalid payload' };
    }

    const call = this.calls.getCall(body.callId);
    if (!call || call.consultationId !== body.consultationId) {
      return { ok: false, error: 'Call not found' };
    }
    if (user.userId !== call.starterId && user.userId !== call.peerId) {
      return { ok: false, error: 'Not a participant' };
    }

    const room = `call_${body.callId}`;
    const existing = await this.server.in(room).fetchSockets();
    const existingPeerIds = new Set(
      existing
        .map((s) => (s.data as SocketAuthData).user?.userId)
        .filter((id): id is string => Boolean(id)),
    );

    await client.join(room);
    client.data.callId = body.callId;

    for (const peerId of existingPeerIds) {
      if (peerId !== user.userId) {
        client.emit('peerJoined', { peerId, callId: body.callId });
      }
    }
    client.to(room).emit('peerJoined', {
      peerId: user.userId,
      callId: body.callId,
    });

    return { ok: true };
  }

  @SubscribeMessage('leaveCall')
  async handleLeaveCall(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { callId?: string },
  ) {
    const user = client.data.user;
    const callId = body?.callId || client.data.callId;
    if (!user || !callId) return { ok: true };

    const room = `call_${callId}`;
    client.to(room).emit('peerLeft', { peerId: user.userId, callId });
    await client.leave(room);
    if (client.data.callId === callId) {
      delete client.data.callId;
    }
    return { ok: true };
  }

  @SubscribeMessage('signaling')
  handleSignaling(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() message: SignalingPayload,
  ) {
    const user = client.data.user;
    if (!user || !message?.to || !message?.from || !message?.type) {
      return { ok: false, error: 'Invalid signaling message' };
    }
    if (message.from !== user.userId) {
      return { ok: false, error: 'from must match authenticated user' };
    }

    this.emitToUser(message.to, 'signaling', message);
    return { ok: true };
  }
}
