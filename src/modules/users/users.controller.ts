import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { publicUser } from '../../common/utils/public-user';
import { Role } from '../../generated/prisma/client';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get('exists')
  @ApiOperation({ summary: 'Check whether an email is already registered' })
  @ApiQuery({ name: 'email', required: false })
  async exists(@Query('email') email?: string) {
    if (!email) return { exists: false };
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    return { exists: Boolean(user) };
  }

  @Get('me')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  async me(@CurrentUser() auth: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: auth.userId },
      include: { doctorProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      ...publicUser(user),
      doctorProfile: user.doctorProfile,
    };
  }

  @Get('patients')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List patients (admin)' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Match patient name or email',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'active | new | inactive | all',
  })
  async listPatients(
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const q = search?.trim();
    const patients = await this.prisma.user.findMany({
      where: {
        role: Role.PATIENT,
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        _count: {
          select: {
            appointmentsAsPatient: true,
            consultationsAsPatient: true,
          },
        },
        appointmentsAsPatient: {
          select: { date: true },
          orderBy: { date: 'desc' },
          take: 1,
        },
        consultationsAsPatient: {
          select: { date: true },
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const thirtyDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 30;
    const rows = patients.map((p) => {
      const visits =
        p._count.appointmentsAsPatient + p._count.consultationsAsPatient;
      const lastDates = [
        p.appointmentsAsPatient[0]?.date,
        p.consultationsAsPatient[0]?.date,
      ].filter(Boolean);
      const lastVisit = lastDates.sort().at(-1) || null;
      const createdRecently = p.createdAt.getTime() > thirtyDaysAgo;
      const derivedStatus: 'active' | 'new' | 'inactive' = visits
        ? 'active'
        : createdRecently
          ? 'new'
          : 'inactive';

      return {
        ...publicUser(p),
        visits,
        lastVisit,
        status: derivedStatus,
      };
    });

    const normalized = status?.toLowerCase();
    if (
      normalized &&
      normalized !== 'all' &&
      ['active', 'new', 'inactive'].includes(normalized)
    ) {
      return rows.filter((r) => r.status === normalized);
    }
    return rows;
  }

  @Get('patients/:id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Get a patient by id (admin/doctor)' })
  async getPatient(@Param('id') id: string) {
    const patient = await this.prisma.user.findFirst({
      where: { id, role: Role.PATIENT },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return publicUser(patient);
  }
}
