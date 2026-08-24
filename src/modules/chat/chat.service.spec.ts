import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationType, Role } from '../../generated/prisma/client';

describe('ChatService', () => {
  let service: ChatService;
  const prisma = {
    conversation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    conversationParticipant: { findUnique: jest.fn() },
    message: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    user: { findFirst: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChatService(prisma as unknown as PrismaService);
  });

  it('ensureParticipant throws when missing', async () => {
    prisma.conversationParticipant.findUnique.mockResolvedValue(null);
    await expect(service.ensureParticipant('c1', 'u1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('createConversation patient care finds admin', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'admin1' });
    prisma.conversation.findFirst.mockResolvedValue(null);
    prisma.conversation.create.mockResolvedValue({
      id: 'c1',
      type: ConversationType.PATIENT_CARE,
    });

    const result = await service.createConversation(
      { userId: 'p1', email: 'p@x.com', role: 'patient' },
      {},
    );
    expect(result.id).toBe('c1');
    expect(result.type).toBe(ConversationType.PATIENT_CARE);
  });

  it('createConversation doctor-patient requires patientId', async () => {
    await expect(
      service.createConversation(
        { userId: 'd1', email: 'd@x.com', role: 'doctor' },
        { type: 'DOCTOR_PATIENT' },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sendMessage creates message for participant', async () => {
    prisma.conversationParticipant.findUnique.mockResolvedValue({ id: 'part' });
    prisma.message.create.mockResolvedValue({
      id: 'm1',
      content: 'hello',
      senderId: 'p1',
      createdAt: new Date(),
      sender: { role: Role.PATIENT },
    });
    prisma.conversation.update.mockResolvedValue({});

    const result = await service.sendMessage(
      { userId: 'p1', email: 'p@x.com', role: 'patient' },
      'c1',
      'hello',
    );
    expect(result.content).toBe('hello');
    expect(result.sender).toBe('patient');
  });

  it('unreadCount queries prisma', async () => {
    prisma.message.count.mockResolvedValue(3);
    await expect(service.unreadCount('u1')).resolves.toBe(3);
  });
});
