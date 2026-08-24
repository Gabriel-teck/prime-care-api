import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus } from '../../generated/prisma/client';

const baseRow = {
  id: 'c1',
  patientId: 'p1',
  doctorId: null as string | null,
  fullName: 'Patient',
  email: 'p@x.com',
  phoneNumber: '123',
  consultationType: 'Video',
  date: '2026-08-01',
  time: '14:00',
  reason: 'Feeling unwell today',
  status: BookingStatus.PENDING,
  rescheduleInfo: null,
  fileUrl: null as string | null,
  fileName: null as string | null,
  googleMeetLink: null as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ConsultationsService', () => {
  let service: ConsultationsService;
  const prisma = {
    consultation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    medicalFile: { create: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConsultationsService(prisma as unknown as PrismaService);
  });

  it('creates consultation without file', async () => {
    prisma.consultation.create.mockResolvedValue(baseRow);
    const result = await service.create(
      { userId: 'p1', email: 'p@x.com', role: 'patient' },
      {
        fullName: 'Patient',
        email: 'p@x.com',
        phoneNumber: '123',
        consultationType: 'Video',
        date: '2026-08-01',
        time: '14:00',
        reason: 'Feeling unwell today',
      },
    );
    expect(result.status).toBe('pending');
    expect(prisma.medicalFile.create).not.toHaveBeenCalled();
  });

  it('creates consultation with file and medical file row', async () => {
    prisma.consultation.create.mockResolvedValue({
      ...baseRow,
      fileUrl: '/uploads/f.png',
      fileName: 'f.png',
    });
    prisma.medicalFile.create.mockResolvedValue({});
    await service.create(
      { userId: 'p1', email: 'p@x.com', role: 'patient' },
      {
        fullName: 'Patient',
        email: 'p@x.com',
        phoneNumber: '123',
        consultationType: 'Video',
        date: '2026-08-01',
        time: '14:00',
        reason: 'Feeling unwell today',
      },
      {
        filename: 'f.png',
        originalname: 'f.png',
      } as Express.Multer.File,
    );
    expect(prisma.medicalFile.create).toHaveBeenCalled();
  });

  it('my lists consultations', async () => {
    prisma.consultation.findMany.mockResolvedValue([baseRow]);
    const rows = await service.my({
      userId: 'p1',
      email: 'p@x.com',
      role: 'patient',
    });
    expect(rows).toHaveLength(1);
    expect(prisma.consultation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patientId: 'p1' },
      }),
    );
  });

  it('my filters by status', async () => {
    prisma.consultation.findMany.mockResolvedValue([baseRow]);
    await service.my(
      { userId: 'p1', email: 'p@x.com', role: 'patient' },
      'confirmed',
    );
    expect(prisma.consultation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          patientId: 'p1',
          status: BookingStatus.CONFIRMED,
        },
      }),
    );
  });

  it('cancel forbids other patients', async () => {
    prisma.consultation.findUnique.mockResolvedValue(baseRow);
    await expect(
      service.cancel(
        { userId: 'other', email: 'o@x.com', role: 'patient' },
        'c1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('update sets meet link for assigned doctor', async () => {
    prisma.consultation.findUnique.mockResolvedValue({
      ...baseRow,
      doctorId: 'd1',
    });
    prisma.consultation.update.mockResolvedValue({
      ...baseRow,
      doctorId: 'd1',
      googleMeetLink: 'https://meet.google.com/x',
    });
    const result = await service.update(
      { userId: 'd1', email: 'd@x.com', role: 'doctor' },
      'c1',
      { googleMeetLink: 'https://meet.google.com/x' },
    );
    expect(result.googleMeetLink).toContain('meet.google.com');
  });

  it('update throws when missing', async () => {
    prisma.consultation.findUnique.mockResolvedValue(null);
    await expect(
      service.update(
        { userId: 'a1', email: 'a@x.com', role: 'admin' },
        'missing',
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
