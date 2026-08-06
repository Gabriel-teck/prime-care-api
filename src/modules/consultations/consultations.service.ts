import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BookingStatus,
  MedicalFileSource,
  Role,
} from '../../generated/prisma/client';
import {
  CreateConsultationDto,
  RescheduleConsultationDto,
  UpdateConsultationDto,
} from './dto/consultation.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';

function toStatus(status?: string): BookingStatus | undefined {
  if (!status) return undefined;
  return status.toUpperCase() as BookingStatus;
}

function serialize(row: {
  id: string;
  patientId: string;
  doctorId: string | null;
  fullName: string;
  email: string;
  phoneNumber: string;
  consultationType: string;
  date: string;
  time: string;
  reason: string;
  status: BookingStatus;
  rescheduleInfo: unknown;
  fileUrl: string | null;
  fileName: string | null;
  googleMeetLink: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return { ...row, status: row.status.toLowerCase() };
}

@Injectable()
export class ConsultationsService {
  constructor(private prisma: PrismaService) {}

  async create(
    auth: AuthUser,
    dto: CreateConsultationDto,
    file?: Express.Multer.File,
  ) {
    const fileUrl = file ? `/uploads/${file.filename}` : null;
    const fileName = file?.originalname || null;

    let doctorId: string | undefined;
    if (dto.doctorId) {
      const doctor = await this.prisma.user.findFirst({
        where: { id: dto.doctorId, role: Role.DOCTOR, isActive: true },
        select: { id: true },
      });
      if (!doctor) {
        throw new BadRequestException('Selected doctor is not available');
      }
      doctorId = doctor.id;
    }

    const consultation = await this.prisma.consultation.create({
      data: {
        patientId: auth.userId,
        doctorId,
        fullName: dto.fullName,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        consultationType: dto.consultationType,
        date: dto.date,
        time: dto.time,
        reason: dto.reason,
        fileUrl,
        fileName,
      },
    });

    if (fileUrl && fileName) {
      await this.prisma.medicalFile.create({
        data: {
          ownerId: auth.userId,
          fileName,
          fileUrl,
          source: MedicalFileSource.CONSULTATION,
          consultationId: consultation.id,
        },
      });
    }

    return serialize(consultation);
  }

  async doctors() {
    const rows = await this.prisma.user.findMany({
      where: { role: Role.DOCTOR, isActive: true },
      select: {
        id: true,
        fullName: true,
        doctorProfile: { select: { specialty: true } },
      },
      orderBy: { fullName: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      specialty: row.doctorProfile?.specialty ?? null,
    }));
  }

  async my(auth: AuthUser) {
    const rows = await this.prisma.consultation.findMany({
      where: { patientId: auth.userId },
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
    });
    return rows.map(serialize);
  }

  async doctorMine(auth: AuthUser) {
    const rows = await this.prisma.consultation.findMany({
      where: { doctorId: auth.userId },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
    return rows.map(serialize);
  }

  async all() {
    const rows = await this.prisma.consultation.findMany({
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
    });
    return rows.map(serialize);
  }

  async cancel(auth: AuthUser, id: string) {
    const row = await this.prisma.consultation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Consultation not found');
    if (row.patientId !== auth.userId && auth.role !== 'admin') {
      throw new ForbiddenException();
    }
    return this.prisma.consultation
      .update({ where: { id }, data: { status: BookingStatus.CANCELLED } })
      .then(serialize);
  }

  async reschedule(auth: AuthUser, id: string, dto: RescheduleConsultationDto) {
    const row = await this.prisma.consultation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Consultation not found');
    if (row.patientId !== auth.userId && auth.role !== 'admin') {
      throw new ForbiddenException();
    }
    return this.prisma.consultation
      .update({
        where: { id },
        data: {
          status: BookingStatus.RESCHEDULED,
          rescheduleInfo: { date: dto.date, time: dto.time },
          date: dto.date,
          time: dto.time,
        },
      })
      .then(serialize);
  }

  async update(auth: AuthUser, id: string, dto: UpdateConsultationDto) {
    const row = await this.prisma.consultation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Consultation not found');
    if (
      auth.role === 'doctor' &&
      row.doctorId &&
      row.doctorId !== auth.userId
    ) {
      throw new ForbiddenException('Not assigned to this consultation');
    }
    const doctorId =
      auth.role === 'doctor' ? (dto.doctorId ?? auth.userId) : dto.doctorId;
    if (auth.role === 'doctor' && doctorId && doctorId !== auth.userId) {
      throw new ForbiddenException('Cannot assign another doctor');
    }
    return this.prisma.consultation
      .update({
        where: { id },
        data: {
          status: toStatus(dto.status),
          rescheduleInfo: dto.rescheduleInfo,
          googleMeetLink: dto.googleMeetLink,
          doctorId,
        },
      })
      .then(serialize);
  }
}
