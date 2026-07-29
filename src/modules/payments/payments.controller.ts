import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import { PaymentStatus, Prisma } from '../../generated/prisma/client';

class UpdatePaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  chatEntitled?: boolean;
}

const VALID_STATUSES = new Set(Object.values(PaymentStatus));

function parseStatus(status?: string): PaymentStatus | undefined {
  if (!status || status === 'all') return undefined;
  const normalized = status.toUpperCase() as PaymentStatus;
  return VALID_STATUSES.has(normalized) ? normalized : undefined;
}

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
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'pending | paid | failed | refunded',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Match patient name, email, or description',
  })
  async list(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const paymentStatus = parseStatus(status);
    const q = search?.trim();

    const where: Prisma.PaymentWhereInput = {
      ...(paymentStatus ? { status: paymentStatus } : {}),
      ...(q
        ? {
            OR: [
              { description: { contains: q, mode: 'insensitive' } },
              { user: { fullName: { contains: q, mode: 'insensitive' } } },
              { user: { email: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.payment.findMany({
      where,
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

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update payment fields (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    const existing = await this.prisma.payment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Payment not found');
    const payment = await this.prisma.payment.update({
      where: { id },
      data: {
        ...(dto.chatEntitled === undefined
          ? {}
          : { chatEntitled: dto.chatEntitled }),
      },
      include: { user: true },
    });
    return {
      id: payment.id,
      patientName: payment.user.fullName,
      patientEmail: payment.user.email,
      amount: Number(payment.amount),
      currency: payment.currency,
      method: payment.method,
      status: payment.status.toLowerCase(),
      description: payment.description,
      chatEntitled: payment.chatEntitled,
      createdAt: payment.createdAt,
    };
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
