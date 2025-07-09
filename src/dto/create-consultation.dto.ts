import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateConsultationDto {
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  consultationType: string;

  @IsString()
  date: string;

  @IsString()
  time: string;

  @IsString()
  @MinLength(5)
  reason: string;
}
