import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
  ) {}

  async getOrCreateConversation(patientId: string, adminId: string) {
    let conv = await this.conversationRepo.findOne({
      where: { patientId, adminId },
    });
    if (!conv) {
      conv = this.conversationRepo.create({ patientId, adminId });
      await this.conversationRepo.save(conv);
    }
    return conv;
  }

  async getConversation(conversationId: string) {
    return this.conversationRepo.findOne({
      where: { id: conversationId },
    });
  }

  async getUserConversations(userId: string, role: string) {
    if (role === 'admin') {
      return this.conversationRepo.find({
        where: { adminId: userId },
        relations: ['messages'],
        order: { updatedAt: 'DESC' },
      });
    } else {
      return this.conversationRepo.find({
        where: { patientId: userId },
        relations: ['messages'],
        order: { updatedAt: 'DESC' },
      });
    }
  }

  async getMessages(conversationId: string) {
    return this.messageRepo.find({
      where: { conversation: { id: conversationId } },
      order: { createdAt: 'ASC' },
    });
  }

  async sendMessage(
    conversationId: string,
    sender: 'patient' | 'admin',
    senderId: string,
    content: string,
  ) {
    const conv = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });
    if (!conv) throw new Error('Conversation not found');

    const msg = this.messageRepo.create({
      conversation: conv,
      sender,
      senderId,
      content,
    });

    const savedMsg = await this.messageRepo.save(msg);

    // Update conversation's updatedAt timestamp
    await this.conversationRepo.update(conversationId, {
      updatedAt: new Date(),
    });

    return savedMsg;
  }
}
