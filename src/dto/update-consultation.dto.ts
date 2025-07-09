import { IsOptional, IsString } from 'class-validator';

export class UpdateConsultationDto {
  @IsOptional()
  @IsString()
  status?: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled' | 'completed';

  @IsOptional()
  rescheduleInfo?: { date: string; time: string };

  @IsOptional()
  @IsString()
  googleMeetLink?: string;
}
