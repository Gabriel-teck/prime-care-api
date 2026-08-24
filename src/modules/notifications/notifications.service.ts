import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private config: ConfigService) {}

  async sendPasswordResetEmail(to: string, resetUrl: string) {
    const user = this.config.get<string>('GMAIL_USER');
    const pass = this.config.get<string>('GMAIL_PASS');
    if (!user || !pass) {
      this.logger.warn(`Password reset link for ${to}: ${resetUrl}`);
      return;
    }
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: user,
      to,
      subject: 'PrimeCare password reset',
      text: `Reset your password: ${resetUrl}`,
      html: `<p>Reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
  }

  async sendContactEmail(input: {
    name: string;
    email: string;
    message: string;
  }) {
    const user = this.config.get<string>('GMAIL_USER');
    const pass = this.config.get<string>('GMAIL_PASS');
    const to =
      this.config.get<string>('CONTACT_TO_EMAIL') ||
      'gabbyjunior4000@gmail.com';

    if (!user || !pass) {
      this.logger.warn(
        `Contact form from ${input.name} <${input.email}> could not be sent (Gmail unset): ${input.message}`,
      );
      throw new ServiceUnavailableException(
        'Email service is not configured. Please try again later.',
      );
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    const text = [
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      '',
      'Message:',
      input.message,
    ].join('\n');

    await transporter.sendMail({
      from: user,
      to,
      replyTo: input.email,
      subject: `PrimeCare contact: ${input.name}`,
      text,
      html: `
        <p><strong>Name:</strong> ${escapeHtml(input.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(input.message).replace(/\n/g, '<br/>')}</p>
      `,
    });
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
