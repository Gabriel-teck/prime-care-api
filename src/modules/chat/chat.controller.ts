import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';

class CreateConversationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({
    description: 'PATIENT_CARE | DOCTOR_ADMIN | DOCTOR_PATIENT',
  })
  @IsOptional()
  @IsString()
  type?: string;
}

class SendMessageDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  conversationId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  content!: string;
}

@ApiTags('Chat')
@ApiBearerAuth('JWT')
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chat: ChatService) {}

  @Get('conversations')
  @ApiOperation({
    summary: 'List conversations for the current user',
    description:
      'Also available over Socket.IO namespace `/chat` (joinConversation, sendMessage, typing, getPresence).',
  })
  list(@CurrentUser() user: AuthUser) {
    return this.chat.listConversations(user);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  messages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.getMessages(user, id);
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation messages as read' })
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.markRead(user.userId, id);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Unread message count' })
  unread(@CurrentUser() user: AuthUser) {
    return this.chat.unreadCount(user.userId).then((count) => ({ count }));
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create or reuse a conversation' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateConversationDto) {
    return this.chat.createConversation(user, dto);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  send(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) {
    return this.chat.sendMessage(user, dto.conversationId, dto.content);
  }
}
