import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendMessageDto } from '../dto/send-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Get('conversations')
  async getUserConversations(@Req() req) {
    try {
      console.log('Getting conversations for user:', req.user);
      const conversations = await this.chatService.getUserConversations(
        req.user.userId,
        req.user.role,
      );
      console.log('Found conversations:', conversations);
      return conversations || []; // Ensure we always return an array
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw new HttpException(
        'Failed to get conversations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations/:id/messages')
  async getMessages(@Param('id') id: string, @Req() req) {
    try {
      // Verify user has access to this conversation
      const conversation = await this.chatService.getConversation(id);
      if (!conversation) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }

      if (
        conversation.patientId !== req.user.userId &&
        conversation.adminId !== req.user.userId
      ) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }

      const messages = await this.chatService.getMessages(id);
      return messages || []; // Ensure we always return an array
    } catch (error) {
      console.error('Error getting messages:', error);
      throw new HttpException(
        'Failed to get messages',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('conversations')
  async createOrGetConversation(@Body() body: { adminId: string }, @Req() req) {
    try {
      return await this.chatService.getOrCreateConversation(
        req.user.userId,
        body.adminId,
      );
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new HttpException(
        'Failed to create conversation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('send')
  async sendMessage(@Body() body: SendMessageDto, @Req() req) {
    try {
      // Verify user has access to this conversation
      const conversation = await this.chatService.getConversation(
        body.conversationId,
      );
      if (!conversation) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }

      if (
        conversation.patientId !== req.user.userId &&
        conversation.adminId !== req.user.userId
      ) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }

      const sender = req.user.role === 'admin' ? 'admin' : 'patient';
      return await this.chatService.sendMessage(
        body.conversationId,
        sender,
        req.user.userId,
        body.content,
      );
    } catch (error) {
      console.error('Error sending message:', error);
      throw new HttpException(
        'Failed to send message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
