import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdatePlatformSettingsDto } from './dto/platform-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth('JWT')
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get('platform')
  @ApiOperation({ summary: 'Get platform settings (admin)' })
  getPlatform() {
    return this.settings.getPlatformSettings();
  }

  @Patch('platform')
  @ApiOperation({ summary: 'Update platform settings (admin)' })
  updatePlatform(@Body() dto: UpdatePlatformSettingsDto) {
    return this.settings.updatePlatformSettings(dto);
  }
}
