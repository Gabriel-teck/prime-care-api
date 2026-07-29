import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BookingsService } from './bookings.service';

@ApiTags('Bookings')
@ApiBearerAuth('JWT')
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class BookingsController {
  constructor(private bookings: BookingsService) {}

  @Get()
  @ApiOperation({
    summary: 'List appointments and consultations (admin)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'pending | confirmed | completed | cancelled | rescheduled',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'appointment | consultation | all',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Match patient name, email, or reason',
  })
  list(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.bookings.list({ status, type, search });
  }
}
