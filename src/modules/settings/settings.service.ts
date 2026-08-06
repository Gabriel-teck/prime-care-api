import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePlatformSettingsDto } from './dto/platform-settings.dto';

const DEFAULT_ID = 'default';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getPlatformSettings() {
    const existing = await this.prisma.platformSettings.findUnique({
      where: { id: DEFAULT_ID },
    });
    if (existing) return existing;

    return this.prisma.platformSettings.create({
      data: { id: DEFAULT_ID },
    });
  }

  async updatePlatformSettings(dto: UpdatePlatformSettingsDto) {
    return this.prisma.platformSettings.upsert({
      where: { id: DEFAULT_ID },
      create: {
        id: DEFAULT_ID,
        brandName: dto.brandName.trim(),
        supportEmail: dto.supportEmail.trim().toLowerCase(),
        timezone: dto.timezone.trim(),
      },
      update: {
        brandName: dto.brandName.trim(),
        supportEmail: dto.supportEmail.trim().toLowerCase(),
        timezone: dto.timezone.trim(),
      },
    });
  }
}
