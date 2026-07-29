import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import { PaymentStatus } from '../../generated/prisma/client';

@ApiTags('Payments')
@ApiBearerAuth('JWT')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List all payments (admin)' })
  @ApiQuery({ name: 'status', required: false })
  async list(@Query('status') status?: string) {
    const rows = await this.prisma.payment.findMany({
      where: status
        ? { status: status.toUpperCase() as PaymentStatus }
        : undefined,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((p) => ({
      id: p.id,
      patientName: p.user.fullName,
      patientEmail: p.user.email,
      amount: Number(p.amount),
      currency: p.currency,
      method: p.method,
      status: p.status.toLowerCase(),
      description: p.description,
      chatEntitled: p.chatEntitled,
      createdAt: p.createdAt,
    }));
  }

  @Get('my')
  @ApiOperation({ summary: 'List my payment history' })
  async my(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.payment.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      method: p.method,
      status: p.status.toLowerCase(),
      description: p.description,
      chatEntitled: p.chatEntitled,
      createdAt: p.createdAt,
    }));
  }

  @Post('unlock-chat')
  @ApiOperation({ summary: 'Demo unlock for care-team chat' })
  async unlockChat(@CurrentUser() user: AuthUser) {
    const payment = await this.prisma.payment.create({
      data: {
        userId: user.userId,
        amount: 25,
        currency: 'USD',
        method: 'Card',
        status: PaymentStatus.PAID,
        description: 'Care team chat unlock',
        chatEntitled: true,
      },
    });
    return {
      id: payment.id,
      chatEntitled: true,
      status: 'paid',
      amount: Number(payment.amount),
    };
  }

  @Get('chat-access')
  @ApiOperation({ summary: 'Check whether chat is unlocked' })
  async chatAccess(@CurrentUser() user: AuthUser) {
    const entitled = await this.prisma.payment.findFirst({
      where: {
        userId: user.userId,
        chatEntitled: true,
        status: PaymentStatus.PAID,
      },
    });
    return { entitled: Boolean(entitled) };
  }
}
