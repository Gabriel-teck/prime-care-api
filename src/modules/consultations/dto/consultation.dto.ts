import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateConsultationDto {
  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiProperty()
  @IsString()
  email!: string;

  @ApiProperty()
  @IsString()
  phoneNumber!: string;

  @ApiProperty({ example: 'Video' })
  @IsString()
  consultationType!: string;

  @ApiProperty({ example: '2026-08-01' })
  @IsString()
  date!: string;

  @ApiProperty({ example: '14:00' })
  @IsString()
  time!: string;

  @ApiProperty({ minLength: 5 })
  @IsString()
  @MinLength(5)
  reason!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Preferred doctor to assign on booking',
  })
  @IsOptional()
  @IsString()
  doctorId?: string;
}

export class UpdateConsultationDto {
  @ApiPropertyOptional({ example: 'confirmed' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  rescheduleInfo?: { date: string; time: string };

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-defg-hij' })
  @IsOptional()
  @IsString()
  googleMeetLink?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  doctorId?: string;
}

export class RescheduleConsultationDto {
  @ApiProperty({ example: '2026-08-02' })
  @IsString()
  date!: string;

  @ApiProperty({ example: '15:00' })
  @IsString()
  time!: string;
}
