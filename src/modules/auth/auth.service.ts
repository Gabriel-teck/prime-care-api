import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../generated/prisma/client';
import { publicUser } from '../../common/utils/public-user';
import {
  ForgotPasswordDto,
  GoogleAuthDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {
    this.googleClient = new OAuth2Client(
      this.config.get<string>('GOOGLE_CLIENT_ID') || undefined,
    );
  }

  private signToken(user: { id: string; email: string; role: Role }) {
    return this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
    });
  }

  private authResponse(user: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    phone?: string | null;
    avatarUrl?: string | null;
    isActive?: boolean;
    createdAt?: Date;
  }) {
    return {
      access_token: this.signToken(user),
      user: publicUser(user),
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        fullName: dto.fullName,
        passwordHash,
        role: Role.PATIENT,
      },
    });
    return this.authResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.authResponse(user);
  }

  async googleAuth(dto: GoogleAuthDto) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const extra = (this.config.get<string>('GOOGLE_CLIENT_IDS') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const audiences = [clientId, ...extra].filter(Boolean) as string[];
    if (!audiences.length) {
      throw new BadRequestException('Google sign-in is not configured');
    }

    let payload: {
      email?: string;
      sub?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    } | null = null;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: audiences,
      });
      payload = ticket.getPayload() ?? null;
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload?.email || !payload.sub || !payload.email_verified) {
      throw new UnauthorizedException('Google account email is not verified');
    }

    const email = payload.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (existing.role !== Role.PATIENT) {
        throw new BadRequestException(
          'Staff accounts must sign in with email and password',
        );
      }
      if (!existing.isActive) {
        throw new UnauthorizedException('Account is inactive');
      }
      const user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          googleId: existing.googleId || payload.sub,
          avatarUrl: existing.avatarUrl || payload.picture || null,
          fullName: existing.fullName || payload.name || existing.fullName,
        },
      });
      return this.authResponse(user);
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        fullName: payload.name || email.split('@')[0],
        googleId: payload.sub,
        avatarUrl: payload.picture || null,
        role: Role.PATIENT,
        passwordHash: null,
      },
    });
    return this.authResponse(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    // Always succeed to avoid email enumeration
    if (!user?.passwordHash) {
      return { message: 'If that email exists, a reset link was sent' };
    }
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      },
    });
    const frontend =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    await this.notifications.sendPasswordResetEmail(
      user.email,
      `${frontend}/reset-password?token=${token}`,
    );
    return { message: 'If that email exists, a reset link was sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: dto.token,
        resetPasswordExpires: { gt: new Date() },
      },
    });
    if (!user) throw new BadRequestException('Invalid or expired reset token');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
    return { message: 'Password updated' };
  }

  async changePassword(
    userId: string,
    dto: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      throw new BadRequestException(
        'Password change is not available for this account',
      );
    }
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { message: 'Password updated' };
  }
}
