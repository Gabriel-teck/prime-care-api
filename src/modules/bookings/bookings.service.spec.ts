import { BookingsService } from './bookings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus } from '../../generated/prisma/client';

describe('BookingsService', () => {
  let service: BookingsService;
  const prisma = {
    appointment: { findMany: jest.fn() },
    consultation: { findMany: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BookingsService(prisma as unknown as PrismaService);
  });

  it('lists both types when type is all', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      {
        id: 'a1',
        patientId: 'p1',
        doctorId: null,
        fullName: 'Ann',
        email: 'a@x.com',
        phoneNumber: '1',
        appointmentType: 'General',
        date: '2026-08-02',
        time: '10:00',
        reason: 'Checkup',
        status: BookingStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    prisma.consultation.findMany.mockResolvedValue([
      {
        id: 'c1',
        patientId: 'p2',
        doctorId: null,
        fullName: 'Bob',
        email: 'b@x.com',
        phoneNumber: '2',
        consultationType: 'Video',
        date: '2026-08-03',
        time: '11:00',
        reason: 'Follow up',
        status: BookingStatus.CONFIRMED,
        googleMeetLink: null,
        fileName: null,
        fileUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const rows = await service.list({});
    expect(rows).toHaveLength(2);
    expect(rows[0].kind).toBe('consultation');
    expect(rows[0].status).toBe('confirmed');
    expect(rows[1].kind).toBe('appointment');
  });

  it('filters by type=appointment', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);
    const rows = await service.list({ type: 'appointment' });
    expect(prisma.appointment.findMany).toHaveBeenCalled();
    expect(prisma.consultation.findMany).not.toHaveBeenCalled();
    expect(rows).toEqual([]);
  });

  it('passes status and search into prisma where', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);
    prisma.consultation.findMany.mockResolvedValue([]);
    await service.list({ status: 'pending', search: 'ann' });
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: BookingStatus.PENDING,
          OR: expect.any(Array),
        }),
      }),
    );
  });
});
