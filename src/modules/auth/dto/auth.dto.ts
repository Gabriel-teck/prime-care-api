import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'patient@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 6, example: 'Password123!' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Eze Macaulay' })
  @IsString()
  @MinLength(1)
  fullName!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'patient@primecare.health' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(1)
  password!: string;
}

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google Identity Services ID token' })
  @IsString()
  @MinLength(10)
  idToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'patient@primecare.health' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty({ minLength: 6, example: 'NewPassword123!' })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
