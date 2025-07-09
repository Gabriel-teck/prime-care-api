import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { NotificationService } from 'src/notification/notification.service';
import { UserService } from 'src/user/user.service';
import { ForgotPasswordDto } from 'src/dto/forgot-password.dto';
import { ResetPasswordDto } from 'src/dto/reset-password.dto';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private notificationService: NotificationService,
  ) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    console.log('Login attempt for email:', body.email);

    const user = await this.authService.validateUser(body.email, body.password);
    console.log(
      'User validation result:',
      user ? 'User found' : 'User not found',
    );

    if (!user) {
      console.log('Login failed: Invalid credentials');
      throw new UnauthorizedException('Invalid credentials');
    }

    const result = this.authService.login(user);
    console.log('Login successful for user:', user.email);
    return result;
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    const user = await this.userService.findByEmail(body.email);
    if (!user)
      return { message: 'If that email exists, a reset link has been sent.' };

    const token = uuidv4();
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await this.userService.save(user);

    //send email with reset link
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await this.notificationService.sendAppointmentUpdate(
      user.email,
      'Reset your password',
      `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    );
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    const user = await this.userService.findByResetToken(body.token);
    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired token');
    }

    user.password = await bcrypt.hash(body.password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userService.save(user);

    return { message: 'Password reset successful. You can now log in.' };
  }
}
