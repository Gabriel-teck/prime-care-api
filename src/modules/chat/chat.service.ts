import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationType, Role } from '../../generated/prisma/client';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async listConversations(auth: AuthUser) {
    const rows = await this.prisma.conversation.findMany({
      where: {
        participants: { some: { userId: auth.userId } },
      },
      include: {
        participants: { include: { user: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((c) => {
      const others = c.participants.filter((p) => p.userId !== auth.userId);
      const peer = others[0]?.user;
      return {
        id: c.id,
        type: c.type,
        patientId: c.participants.find((p) => p.user.role === Role.PATIENT)
          ?.userId,
        adminId: c.participants.find((p) => p.user.role === Role.ADMIN)?.userId,
        doctorId: c.participants.find((p) => p.user.role === Role.DOCTOR)
          ?.userId,
        peer: peer
          ? {
              id: peer.id,
              fullName: peer.fullName,
              email: peer.email,
              role: peer.role.toLowerCase(),
            }
          : null,
        messages: c.messages.map((m) => ({
          id: m.id,
          content: m.content,
          sender: m.senderId === auth.userId ? 'patient' : 'admin',
          createdAt: m.createdAt,
        })),
        updatedAt: c.updatedAt,
      };
    });
  }

  async ensureParticipant(conversationId: string, userId: string) {
    const part = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });
    if (!part) throw new ForbiddenException('Not a conversation participant');
    return part;
  }

  async getMessages(auth: AuthUser, conversationId: string) {
    await this.ensureParticipant(conversationId, auth.userId);
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: true },
    });
    return messages.map((m) => ({
      id: m.id,
      content: m.content,
      sender:
        m.sender.role === Role.PATIENT
          ? 'patient'
          : m.sender.role === Role.DOCTOR
            ? 'doctor'
            : 'admin',
      senderId: m.senderId,
      createdAt: m.createdAt,
      readAt: m.readAt,
    }));
  }

  async createConversation(
    auth: AuthUser,
    body: {
      adminId?: string;
      doctorId?: string;
      patientId?: string;
      type?: string;
    },
  ) {
    let type: ConversationType = ConversationType.PATIENT_CARE;
    const participantIds = new Set<string>([auth.userId]);

    if (
      body.type === 'DOCTOR_ADMIN' ||
      (auth.role === 'doctor' && body.adminId)
    ) {
      type = ConversationType.DOCTOR_ADMIN;
      if (body.adminId) participantIds.add(body.adminId);
      else {
        const admin = await this.prisma.user.findFirst({
          where: { role: Role.ADMIN, isActive: true },
        });
        if (!admin) throw new NotFoundException('No admin available');
        participantIds.add(admin.id);
      }
    } else if (
      body.type === 'DOCTOR_PATIENT' ||
      (auth.role === 'doctor' && body.patientId)
    ) {
      type = ConversationType.DOCTOR_PATIENT;
      if (!body.patientId) throw new NotFoundException('patientId required');
      participantIds.add(body.patientId);
    } else {
      type = ConversationType.PATIENT_CARE;
      const peerId = body.adminId || body.doctorId;
      if (peerId) participantIds.add(peerId);
      else {
        const admin = await this.prisma.user.findFirst({
          where: { role: Role.ADMIN, isActive: true },
        });
        if (!admin) throw new NotFoundException('No care staff available');
        participantIds.add(admin.id);
      }
    }

    const ids = [...participantIds];
    const existing = await this.prisma.conversation.findFirst({
      where: {
        type,
        AND: ids.map((userId) => ({
          participants: { some: { userId } },
        })),
      },
      include: { participants: true },
    });
    if (
      existing &&
      existing.participants.length === ids.length &&
      ids.every((id) => existing.participants.some((p) => p.userId === id))
    ) {
      return { id: existing.id, type: existing.type };
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        type,
        participants: {
          create: ids.map((userId) => ({ userId })),
        },
      },
    });
    return { id: conversation.id, type: conversation.type };
  }

  async sendMessage(auth: AuthUser, conversationId: string, content: string) {
    await this.ensureParticipant(conversationId, auth.userId);
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: auth.userId,
        content,
      },
      include: { sender: true },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    return {
      id: message.id,
      content: message.content,
      sender:
        message.sender.role === Role.PATIENT
          ? 'patient'
          : message.sender.role === Role.DOCTOR
            ? 'doctor'
            : 'admin',
      senderId: message.senderId,
      createdAt: message.createdAt,
      conversationId,
    };
  }

  async unreadCount(userId: string) {
    return this.prisma.message.count({
      where: {
        readAt: null,
        senderId: { not: userId },
        conversation: {
          participants: { some: { userId } },
        },
      },
    });
  }
}
