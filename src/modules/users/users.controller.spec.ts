import { NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../generated/prisma/client';

describe('UsersController', () => {
  let controller: UsersController;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UsersController(prisma as unknown as PrismaService);
  });

  it('exists returns false without email', async () => {
    await expect(controller.exists()).resolves.toEqual({ exists: false });
  });

  it('exists returns true when user found', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    await expect(controller.exists('a@b.com')).resolves.toEqual({
      exists: true,
    });
  });

  it('me returns public user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      fullName: 'A',
      role: Role.PATIENT,
      phone: null,
      avatarUrl: null,
      isActive: true,
      doctorProfile: null,
    });
    const result = await controller.me({
      userId: 'u1',
      email: 'a@b.com',
      role: 'patient',
    });
    expect(result.email).toBe('a@b.com');
    expect(result.role).toBe('patient');
  });

  it('me throws when missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      controller.me({ userId: 'x', email: 'x', role: 'patient' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('listPatients maps public users with visit stats', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'p1',
        email: 'p@x.com',
        fullName: 'P',
        role: Role.PATIENT,
        phone: null,
        avatarUrl: null,
        isActive: true,
        createdAt: new Date(),
        _count: {
          appointmentsAsPatient: 1,
          consultationsAsPatient: 0,
        },
        appointmentsAsPatient: [{ date: '2026-08-01' }],
        consultationsAsPatient: [],
      },
    ]);
    const rows = await controller.listPatients();
    expect(rows).toHaveLength(1);
    expect(rows[0].role).toBe('patient');
    expect(rows[0].visits).toBe(1);
    expect(rows[0].status).toBe('active');
    expect(rows[0].lastVisit).toBe('2026-08-01');
  });

  it('listPatients filters by status', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'p1',
        email: 'p@x.com',
        fullName: 'Active',
        role: Role.PATIENT,
        phone: null,
        avatarUrl: null,
        isActive: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60),
        _count: {
          appointmentsAsPatient: 2,
          consultationsAsPatient: 0,
        },
        appointmentsAsPatient: [{ date: '2026-07-01' }],
        consultationsAsPatient: [],
      },
      {
        id: 'p2',
        email: 'n@x.com',
        fullName: 'New',
        role: Role.PATIENT,
        phone: null,
        avatarUrl: null,
        isActive: true,
        createdAt: new Date(),
        _count: {
          appointmentsAsPatient: 0,
          consultationsAsPatient: 0,
        },
        appointmentsAsPatient: [],
        consultationsAsPatient: [],
      },
    ]);
    const rows = await controller.listPatients(undefined, 'new');
    expect(rows).toHaveLength(1);
    expect(rows[0].fullName).toBe('New');
  });

  it('getPatient throws when not found', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(controller.getPatient('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
