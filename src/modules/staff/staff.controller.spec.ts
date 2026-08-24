import { NotFoundException } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../generated/prisma/client';

describe('StaffController', () => {
  let controller: StaffController;
  const prisma = {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new StaffController(prisma as unknown as PrismaService);
  });

  it('lists doctors when role=doctor', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'd1',
        email: 'doc@x.com',
        fullName: 'Doc',
        role: Role.DOCTOR,
        phone: null,
        avatarUrl: null,
        isActive: true,
        doctorProfile: { specialty: 'GP', bio: null },
      },
    ]);
    const rows = await controller.list('doctor');
    expect(rows[0].specialty).toBe('GP');
  });

  it('get throws when missing', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(controller.get('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('createDoctor creates user with profile', async () => {
    prisma.user.create.mockResolvedValue({
      id: 'd1',
      email: 'doc@x.com',
      fullName: 'Doc',
      role: Role.DOCTOR,
      phone: null,
      avatarUrl: null,
      isActive: true,
      doctorProfile: { specialty: 'Cardiology', bio: 'bio' },
    });
    const result = await controller.createDoctor({
      email: 'Doc@X.com',
      password: 'Password123!',
      fullName: 'Doc',
      specialty: 'Cardiology',
      bio: 'bio',
    });
    expect(result.doctorProfile?.specialty).toBe('Cardiology');
    expect(prisma.user.create).toHaveBeenCalled();
  });
});
