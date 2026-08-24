import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus } from '../../generated/prisma/client';
import {
  CreateAppointmentDto,
  RescheduleDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto';
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
  appointmentType: string;
  date: string;
  time: string;
  reason: string;
  status: BookingStatus;
  rescheduleInfo: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...row,
    status: row.status.toLowerCase(),
  };
}

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  create(auth: AuthUser, dto: CreateAppointmentDto) {
    return this.prisma.appointment
      .create({
        data: {
          patientId: auth.userId,
          fullName: dto.fullName,
          email: dto.email,
          phoneNumber: dto.phoneNumber,
          appointmentType: dto.appointmentType,
          date: dto.date,
          time: dto.time,
          reason: dto.reason,
        },
      })
      .then(serialize);
  }

  async my(auth: AuthUser) {
    const rows = await this.prisma.appointment.findMany({
      where: { patientId: auth.userId },
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
    });
    return rows.map(serialize);
  }

  async doctorMine(auth: AuthUser) {
    const rows = await this.prisma.appointment.findMany({
      where: { doctorId: auth.userId },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
    return rows.map(serialize);
  }

  async all() {
    const rows = await this.prisma.appointment.findMany({
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
    });
    return rows.map(serialize);
  }

  async cancel(auth: AuthUser, id: string) {
    const row = await this.prisma.appointment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Appointment not found');
    if (row.patientId !== auth.userId && auth.role !== 'admin') {
      throw new ForbiddenException();
    }
    return this.prisma.appointment
      .update({
        where: { id },
        data: { status: BookingStatus.CANCELLED },
      })
      .then(serialize);
  }

  async reschedule(auth: AuthUser, id: string, dto: RescheduleDto) {
    const row = await this.prisma.appointment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Appointment not found');
    if (row.patientId !== auth.userId && auth.role !== 'admin') {
      throw new ForbiddenException();
    }
    return this.prisma.appointment
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

  async update(auth: AuthUser, id: string, dto: UpdateAppointmentDto) {
    const row = await this.prisma.appointment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Appointment not found');
    if (
      auth.role === 'doctor' &&
      row.doctorId &&
      row.doctorId !== auth.userId
    ) {
      throw new ForbiddenException('Not assigned to this appointment');
    }
    const doctorId =
      auth.role === 'doctor' ? (dto.doctorId ?? auth.userId) : dto.doctorId;
    if (auth.role === 'doctor' && doctorId && doctorId !== auth.userId) {
      throw new ForbiddenException('Cannot assign another doctor');
    }
    return this.prisma.appointment
      .update({
        where: { id },
        data: {
          status: toStatus(dto.status),
          rescheduleInfo: dto.rescheduleInfo,
          doctorId,
        },
      })
      .then(serialize);
  }
}
