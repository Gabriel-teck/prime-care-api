import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  async sendAppointmentUpdate(email: string, subject: string, message: string) {
    await this.transporter.sendMail({
      from: '"PrimeCare" <no-reply@primecare.com>',
      to: email,
      subject,
      html: message,
    });
  }
}
