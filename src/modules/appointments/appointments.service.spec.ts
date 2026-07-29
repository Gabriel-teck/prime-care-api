import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus } from '../../generated/prisma/client';

const baseRow = {
  id: 'a1',
  patientId: 'p1',
  doctorId: null as string | null,
  fullName: 'Patient',
  email: 'p@x.com',
  phoneNumber: '123',
  appointmentType: 'General',
  date: '2026-08-01',
  time: '10:00',
  reason: 'Checkup',
  status: BookingStatus.PENDING,
  rescheduleInfo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  const prisma = {
    appointment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AppointmentsService(prisma as unknown as PrismaService);
  });

  it('creates appointment for patient', async () => {
    prisma.appointment.create.mockResolvedValue(baseRow);
    const result = await service.create(
      { userId: 'p1', email: 'p@x.com', role: 'patient' },
      {
        fullName: 'Patient',
        email: 'p@x.com',
        phoneNumber: '123',
        appointmentType: 'General',
        date: '2026-08-01',
        time: '10:00',
        reason: 'Checkup',
      },
    );
    expect(result.status).toBe('pending');
  });

  it('my lists patient appointments', async () => {
    prisma.appointment.findMany.mockResolvedValue([baseRow]);
    const rows = await service.my({
      userId: 'p1',
      email: 'p@x.com',
      role: 'patient',
    });
    expect(rows).toHaveLength(1);
  });

  it('doctorMine lists assigned appointments', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      { ...baseRow, doctorId: 'd1' },
    ]);
    const rows = await service.doctorMine({
      userId: 'd1',
      email: 'd@x.com',
      role: 'doctor',
    });
    expect(rows[0].doctorId).toBe('d1');
  });

  it('cancel forbids other patients', async () => {
    prisma.appointment.findUnique.mockResolvedValue(baseRow);
    await expect(
      service.cancel(
        { userId: 'other', email: 'o@x.com', role: 'patient' },
        'a1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reschedule updates date/time', async () => {
    prisma.appointment.findUnique.mockResolvedValue(baseRow);
    prisma.appointment.update.mockResolvedValue({
      ...baseRow,
      status: BookingStatus.RESCHEDULED,
      date: '2026-08-02',
      time: '11:00',
    });
    const result = await service.reschedule(
      { userId: 'p1', email: 'p@x.com', role: 'patient' },
      'a1',
      { date: '2026-08-02', time: '11:00' },
    );
    expect(result.status).toBe('rescheduled');
  });

  it('update blocks doctor from another doctor assignment', async () => {
    prisma.appointment.findUnique.mockResolvedValue({
      ...baseRow,
      doctorId: 'other-doc',
    });
    await expect(
      service.update({ userId: 'd1', email: 'd@x.com', role: 'doctor' }, 'a1', {
        status: 'confirmed',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('update throws when missing', async () => {
    prisma.appointment.findUnique.mockResolvedValue(null);
    await expect(
      service.update(
        { userId: 'a1', email: 'a@x.com', role: 'admin' },
        'missing',
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
