import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Consultation } from './consultation.entity';
import { ConsultationService } from './consultation.service';
import { ConsultationController } from './consultation.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([Consultation]), NotificationModule],
  providers: [ConsultationService],
  controllers: [ConsultationController],
})
export class ConsultationModule {}
