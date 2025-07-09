import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './appointment.entity';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationGateway } from 'src/notification/notification.gateway';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private repo: Repository<Appointment>,
    private notificationService: NotificationService,
    private notificationGateway: NotificationGateway,
  ) {}

  create(data: Partial<Appointment>) {
    const appointment = this.repo.create(data);
    return this.repo.save(appointment);
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

  async update(id: string, data: Partial<Appointment>) {
    const appt = await this.findOne(id);
    if (!appt) throw new NotFoundException('Appointment not found');
    Object.assign(appt, data);
    const updated = await this.repo.save(appt);

    //send Notification on status change
    if (data.status === 'confirmed') {
      //Email
      await this.notificationService.sendAppointmentUpdate(
        appt.email,
        'Your appointmet is confirmed',
        `<p>Your appointment on <b>${appt.date}</b> at <b>${appt.time}</b> has been <b>confirmed</b>.</p>`,
      );

      //In-app
      this.notificationGateway.notifyUser(appt.patientId, {
        type: 'appointment_confirmed',
        message: `Your appointment on ${appt.date} at ${appt.time} has been confirmed.`,
        appointmentId: appt.id,
      });
    }
    if (data.status === 'rescheduled') {
      await this.notificationService.sendAppointmentUpdate(
        appt.email,
        'Your Appointment has been Rescheduled',
        `<p>Your appointment has been <b>rescheduled</b> to <b>${appt.date}</b> at <b>${appt.time}</b>.</p>`,
      );
      this.notificationGateway.notifyUser(appt.patientId, {
        type: 'appointment_rescheduled',
        message: `Your appointment has been rescheduled to ${appt.date} at ${appt.time}.`,
        appointmentId: appt.id,
      });
    }
    return updated;
  }
}
