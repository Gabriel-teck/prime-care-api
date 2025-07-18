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
  NotFoundException,
  Param,
} from '@nestjs/common';
import { UserService } from './user.service';
import * as bcrypt from 'bcryptjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from '../dto/create-user.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorator/roles.decorator';

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

  // Add this endpoint to get all patients for admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('patients')
  async getAllPatients() {
    const patients = await this.userService.findAllPatients();
    // Remove password from response
    return patients.map(({ password, ...patient }) => patient);
  }

  //this endpoint gets patient by ID for admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('patients/:id')
  async getPatientById(@Param('id') id: string) {
    const patient = await this.userService.findById(id);
    if (!patient || patient.role !== 'patient') {
      throw new NotFoundException('Patient not found');
    }
    // Remove password from response
    const { password, ...patientData } = patient;
    return patientData;
  }
}
