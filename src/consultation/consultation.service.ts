import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from './consultation.entity';
import { NotificationGateway } from '../notification/notification.gateway';
// import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ConsultationService {
  constructor(
    @InjectRepository(Consultation) private repo: Repository<Consultation>,
    // private notificationService: NotificationService,
    private notificationGateway: NotificationGateway,
  ) {}

  create(data: Partial<Consultation>) {
    const consultation = this.repo.create(data);
    return this.repo.save(consultation);
  }

  findAll() {
    return this.repo.find();
  }

  findByPatient(patientId: string) {
    return this.repo.find({ where: { patientId } });
  }

  findOne(id: string) {
    return this.repo.findOneBy({ id });
  }

  async update(id: string, data: Partial<Consultation>) {
    const consult = await this.findOne(id);
    if (!consult) throw new NotFoundException('Consultation not found');
    Object.assign(consult, data);
    const updated = await this.repo.save(consult);

    // Send in-app notifications on status change
    if (data.status === 'confirmed') {
      // In-app notification only
      this.notificationGateway.notifyUser(consult.patientId, {
        type: 'consultation_confirmed',
        message: `Your consultation on ${consult.date} at ${consult.time} has been confirmed.`,
        consultationId: consult.id,
        googleMeetLink: consult.googleMeetLink,
      });
    }

    if (data.status === 'rescheduled') {
      // In-app notification only
      this.notificationGateway.notifyUser(consult.patientId, {
        type: 'consultation_rescheduled',
        message: `Your consultation has been rescheduled to ${consult.date} at ${consult.time}.`,
        consultationId: consult.id,
      });
    }

    return updated;
  }
}
