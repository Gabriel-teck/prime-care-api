import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsString()
  status?: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled' | 'completed';

  @IsOptional()
  rescheduleInfo?: { date: string; time: string };
}

export class RescheduleAppointmentDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  time: string;
}