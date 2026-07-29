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
  async listPatients() {
    const patients = await this.prisma.user.findMany({
      where: { role: Role.PATIENT },
      orderBy: { createdAt: 'desc' },
    });
    return patients.map(publicUser);
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
