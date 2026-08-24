import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import {
  CreateAppointmentDto,
  RescheduleDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto';

@ApiTags('Appointments')
@ApiBearerAuth('JWT')
@Controller('appointment')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private appointments: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Book an appointment (patient)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAppointmentDto) {
    return this.appointments.create(user, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'List my appointments' })
  my(@CurrentUser() user: AuthUser) {
    return this.appointments.my(user);
  }

  @Get('doctor/my')
  @UseGuards(RolesGuard)
  @Roles('doctor')
  @ApiOperation({ summary: 'List appointments assigned to the doctor' })
  doctorMine(@CurrentUser() user: AuthUser) {
    return this.appointments.doctorMine(user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List all appointments (admin)' })
  all() {
    return this.appointments.all();
  }

  @Patch('cancel/:id')
  @ApiOperation({ summary: 'Cancel an appointment' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.appointments.cancel(user, id);
  }

  @Patch('rescheduled/:id')
  @ApiOperation({ summary: 'Reschedule an appointment' })
  reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RescheduleDto,
  ) {
    return this.appointments.reschedule(user, id, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Update status / assign doctor (admin/doctor)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointments.update(user, id, dto);
  }
}
