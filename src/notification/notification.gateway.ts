import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ ccors: true })
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  //call this to emit to a specific user (by Id)
  notifyUser(userId: string, payload: any) {
    this.server.to(userId).emit('notification', payload);
  }

  //on connection, join a room with the user's ID
  handleConnection(socket: any) {
    const userId = socket.handshake.query.userId;
    if (userId) {
      socket.join(userId);
    }
  }
}
