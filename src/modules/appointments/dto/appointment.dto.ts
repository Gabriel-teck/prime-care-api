import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiProperty()
  @IsString()
  email!: string;

  @ApiProperty()
  @IsString()
  phoneNumber!: string;

  @ApiProperty({ example: 'General' })
  @IsString()
  appointmentType!: string;

  @ApiProperty({ example: '2026-08-01' })
  @IsString()
  date!: string;

  @ApiProperty({ example: '10:00' })
  @IsString()
  time!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  reason!: string;
}

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ example: 'confirmed' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  rescheduleInfo?: { date: string; time: string };

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  doctorId?: string;
}

export class RescheduleDto {
  @ApiProperty({ example: '2026-08-02' })
  @IsString()
  date!: string;

  @ApiProperty({ example: '11:00' })
  @IsString()
  time!: string;
}
