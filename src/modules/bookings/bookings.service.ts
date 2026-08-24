import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type BookingListQuery = {
  status?: string;
  type?: string;
  search?: string;
};

const VALID_STATUSES = new Set(Object.values(BookingStatus));

function parseStatus(status?: string): BookingStatus | undefined {
  if (!status || status === 'all') return undefined;
  const normalized = status.toUpperCase() as BookingStatus;
  return VALID_STATUSES.has(normalized) ? normalized : undefined;
}

function parseType(type?: string): 'appointment' | 'consultation' | 'all' {
  if (!type || type === 'all') return 'all';
  if (type === 'appointment' || type === 'consultation') return type;
  return 'all';
}

function searchWhere(search?: string): Prisma.StringFilter | undefined {
  const q = search?.trim();
  if (!q) return undefined;
  return { contains: q, mode: 'insensitive' };
}

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async list(query: BookingListQuery = {}) {
    const status = parseStatus(query.status);
    const type = parseType(query.type);
    const text = searchWhere(query.search);

    const searchOr = text
      ? [{ fullName: text }, { email: text }, { reason: text }]
      : undefined;

    const [appointments, consultations] = await Promise.all([
      type === 'consultation'
        ? Promise.resolve([])
        : this.prisma.appointment.findMany({
            where: {
              ...(status ? { status } : {}),
              ...(searchOr ? { OR: searchOr } : {}),
            },
            orderBy: [{ date: 'desc' }, { time: 'desc' }],
          }),
      type === 'appointment'
        ? Promise.resolve([])
        : this.prisma.consultation.findMany({
            where: {
              ...(status ? { status } : {}),
              ...(searchOr ? { OR: searchOr } : {}),
            },
            orderBy: [{ date: 'desc' }, { time: 'desc' }],
          }),
    ]);

    const rows = [
      ...appointments.map((row) => ({
        id: row.id,
        fullName: row.fullName,
        email: row.email,
        phoneNumber: row.phoneNumber,
        date: row.date,
        time: row.time,
        status: row.status.toLowerCase(),
        reason: row.reason,
        kind: 'appointment' as const,
        typeLabel: row.appointmentType,
        doctorId: row.doctorId,
        patientId: row.patientId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      ...consultations.map((row) => ({
        id: row.id,
        fullName: row.fullName,
        email: row.email,
        phoneNumber: row.phoneNumber,
        date: row.date,
        time: row.time,
        status: row.status.toLowerCase(),
        reason: row.reason,
        kind: 'consultation' as const,
        typeLabel: row.consultationType,
        googleMeetLink: row.googleMeetLink,
        fileName: row.fileName,
        fileUrl: row.fileUrl,
        doctorId: row.doctorId,
        patientId: row.patientId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    ];

    return rows.sort((a, b) =>
      `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`),
    );
  }
}
