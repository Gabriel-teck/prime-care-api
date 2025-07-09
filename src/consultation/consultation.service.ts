import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from './consultation.entity';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class ConsultationService {
  constructor(
    @InjectRepository(Consultation) private repo: Repository<Consultation>,
    private notificationService: NotificationService,
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

    // Send notifications on status change
    if (data.status === 'confirmed') {
      // Email
      await this.notificationService.sendAppointmentUpdate(
        consult.email,
        'Your Consultation is Confirmed',
        `<p>Your consultation on <b>${consult.date}</b> at <b>${consult.time}</b> has been <b>confirmed</b>.</p>
      ${consult.googleMeetLink ? `<p>Join via Google Meet: <a href="${consult.googleMeetLink}">${consult.googleMeetLink}</a></p>` : ''}`,
      );

      // In-app
      this.notificationGateway.notifyUser(consult.patientId, {
        type: 'consultation_confirmed',
        message: `Your consultation on ${consult.date} at ${consult.time} has been confirmed.`,
        consultationId: consult.id,
        googleMeetLink: consult.googleMeetLink,
      });
    }

    if (data.status === 'rescheduled') {
      await this.notificationService.sendAppointmentUpdate(
        consult.email,
        'Your Consultation has been Rescheduled',
        `<p>Your consultation has been <b>rescheduled</b> to <b>${consult.date}</b> at <b>${consult.time}</b>.</p>`,
      );
      this.notificationGateway.notifyUser(consult.patientId, {
        type: 'consultation_rescheduled',
        message: `Your consultation has been rescheduled to ${consult.date} at ${consult.time}.`,
        consultationId: consult.id,
      });
    }
    return updated;
  }
}
