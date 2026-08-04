import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { ContactDto } from './dto/contact.dto';

@Injectable()
export class ContactService {
  constructor(private notifications: NotificationsService) {}

  async submit(dto: ContactDto) {
    await this.notifications.sendContactEmail({
      name: dto.name.trim(),
      email: dto.email.trim(),
      message: dto.message.trim(),
    });
    return { ok: true };
  }
}
