import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Query,
  ConflictException,
} from '@nestjs/common';
import { UserService } from './user.service';
import * as bcrypt from 'bcryptjs';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateUserDto } from 'src/dto/create-user.dto';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async register(@Body() body: CreateUserDto) {
    try {
      const existing = await this.userService.findByEmail(body.email);
      if (existing) {
        throw new ConflictException('Email already exists');
      }
      const hashed = await bcrypt.hash(body.password, 10);
      return this.userService.create({
        ...body,
        password: hashed,
        role: 'patient',
      });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  @Get('exists')
  async emailExists(@Query('email') email: string) {
    const user = await this.userService.findByEmail(email);
    return { exists: !!user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('test-auth')
  async testAuth(@Req() req) {
    console.log('�� Test auth endpoint: Request user object:', req.user);
    return { message: 'Auth working!', user: req.user };
  }

  @Get('debug-jwt')
  async debugJwt(@Req() req) {
    console.log('🔍 Debug JWT: All headers:', req.headers);
    console.log(
      '🔍 Debug JWT: Authorization header:',
      req.headers.authorization,
    );
    return {
      message: 'Debug endpoint',
      hasAuthHeader: !!req.headers.authorization,
      authHeader: req.headers.authorization,
    };
  }

  // TEMPORARY: Admin password reset endpoint
  @Post('admin-reset-password')
  async adminResetPassword(
    @Body() body: { email: string; newPassword: string },
  ) {
    const user = await this.userService.findByEmail(body.email);
    if (!user) {
      return { message: 'User not found' };
    }
    user.password = await bcrypt.hash(body.newPassword, 10);
    await this.userService.save(user);
    return { message: 'Password reset successful for ' + body.email };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req) {
    console.log('Backend /users/me: Request user object:', req.user);
    console.log('Backend /users/me: User ID:', req.user?.userId);

    const user = await this.userService.findById(req.user.userId);
    console.log('Backend /users/me: Found user:', user ? 'Yes' : 'No');
    if (user) {
      const { password, ...rest } = user;
      return rest;
    }
    return null;
  }
}
