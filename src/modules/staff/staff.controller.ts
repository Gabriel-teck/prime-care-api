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
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { publicUser } from '../../common/utils/public-user';
import * as bcrypt from 'bcryptjs';

class CreateDoctorDto {
  @ApiProperty()
  @IsString()
  email!: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiProperty()
  @IsString()
  specialty!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;
}

class UpdateDoctorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultMeetLink?: string;
}

@ApiTags('Staff')
@ApiBearerAuth('JWT')
@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class StaffController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List staff (doctors and/or admins)' })
  @ApiQuery({ name: 'role', required: false, example: 'doctor' })
  async list(@Query('role') role?: string) {
    const where =
      role === 'doctor'
        ? { role: Role.DOCTOR }
        : { role: { in: [Role.DOCTOR, Role.ADMIN] } };
    const users = await this.prisma.user.findMany({
      where,
      include: { doctorProfile: true },
      orderBy: { fullName: 'asc' },
    });
    return users.map((u) => ({
      ...publicUser(u),
      specialty: u.doctorProfile?.specialty || null,
      bio: u.doctorProfile?.bio || null,
      active: u.isActive,
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff member by id' })
  async get(@Param('id') id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: { in: [Role.DOCTOR, Role.ADMIN] } },
      include: { doctorProfile: true },
    });
    if (!user) throw new NotFoundException('Staff not found');
    return {
      ...publicUser(user),
      doctorProfile: user.doctorProfile,
    };
  }

  @Post('doctors')
  @ApiOperation({ summary: 'Create a doctor account' })
  async createDoctor(@Body() dto: CreateDoctorDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        fullName: dto.fullName,
        passwordHash,
        phone: dto.phone,
        role: Role.DOCTOR,
        doctorProfile: {
          create: {
            specialty: dto.specialty,
            bio: dto.bio,
          },
        },
      },
      include: { doctorProfile: true },
    });
    return {
      ...publicUser(user),
      doctorProfile: user.doctorProfile,
    };
  }

  @Patch('doctors/:id')
  @ApiOperation({ summary: 'Update a doctor profile' })
  async updateDoctor(@Param('id') id: string, @Body() dto: UpdateDoctorDto) {
    const existing = await this.prisma.user.findFirst({
      where: { id, role: Role.DOCTOR },
    });
    if (!existing) throw new NotFoundException('Doctor not found');
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        isActive: dto.isActive,
        doctorProfile: {
          update: {
            specialty: dto.specialty,
            bio: dto.bio,
            defaultMeetLink: dto.defaultMeetLink,
          },
        },
      },
      include: { doctorProfile: true },
    });
    return {
      ...publicUser(user),
      doctorProfile: user.doctorProfile,
    };
  }
}
