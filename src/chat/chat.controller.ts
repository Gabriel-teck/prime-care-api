import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendMessageDto } from 'src/dto/send-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Get('conversations')
  async getUserConversations(@Req() req) {
    return this.chatService.getUserConversations(
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations/:id/messages')
  async getMessages(@Param('id') id: string, @Req() req) {
    // Verify user has access to this conversation
    const conversation = await this.chatService.getConversation(id);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (
      conversation.patientId !== req.user.userId &&
      conversation.adminId !== req.user.userId
    ) {
      throw new Error('Access denied');
    }

    return this.chatService.getMessages(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('conversations')
  async createOrGetConversation(@Body() body: { adminId: string }, @Req() req) {
    return this.chatService.getOrCreateConversation(
      req.user.userId,
      body.adminId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('send')
  async sendMessage(@Body() body: SendMessageDto, @Req() req) {
    // Verify user has access to this conversation
    const conversation = await this.chatService.getConversation(
      body.conversationId,
    );
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (
      conversation.patientId !== req.user.userId &&
      conversation.adminId !== req.user.userId
    ) {
      throw new Error('Access denied');
    }

    const sender = req.user.role === 'admin' ? 'admin' : 'patient';
    return this.chatService.sendMessage(
      body.conversationId,
      sender,
      req.user.userId,
      body.content,
    );
  }
}
