import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Role } from '../../generated/prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const jwt = { sign: jest.fn().mockReturnValue('token') };
  const config = { get: jest.fn() };
  const notifications = { sendPasswordResetEmail: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string) => {
      if (key === 'FRONTEND_URL') return 'http://localhost:3000';
      return undefined;
    });
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      notifications as unknown as NotificationsService,
    );
  });

  it('registers a patient', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'u1',
      email: 'new@example.com',
      fullName: 'New User',
      role: Role.PATIENT,
      phone: null,
      avatarUrl: null,
      isActive: true,
    });

    const result = await service.register({
      email: 'new@example.com',
      password: 'Password123!',
      fullName: 'New User',
    });

    expect(result.access_token).toBe('token');
    expect(result.user.role).toBe('patient');
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('rejects duplicate register', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    await expect(
      service.register({
        email: 'new@example.com',
        password: 'Password123!',
        fullName: 'New User',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('logs in with valid password', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'patient@primecare.health',
      fullName: 'Patient',
      role: Role.PATIENT,
      passwordHash,
      isActive: true,
    });

    const result = await service.login({
      email: 'patient@primecare.health',
      password: 'Password123!',
    });
    expect(result.access_token).toBe('token');
  });

  it('rejects login without password hash', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: null,
      isActive: true,
    });
    await expect(
      service.login({ email: 'x@y.com', password: 'Password123!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects google when not configured', async () => {
    await expect(
      service.googleAuth({ idToken: 'abc1234567890' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forgot password returns generic message when user missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await service.forgotPassword({ email: 'missing@x.com' });
    expect(result.message).toContain('reset link');
    expect(notifications.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('reset password updates hash for valid token', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      resetPasswordToken: 'tok',
      resetPasswordExpires: new Date(Date.now() + 60_000),
    });
    prisma.user.update.mockResolvedValue({});

    const result = await service.resetPassword({
      token: 'tok',
      password: 'NewPass1!',
    });
    expect(result.message).toBe('Password updated');
    expect(prisma.user.update).toHaveBeenCalled();
  });
});
