import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
  Patch,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from '../dto/create-appointment.dto';
import { RescheduleAppointmentDto, UpdateAppointmentDto } from '../dto/update-appointment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorator/roles.decorator';

@Controller('appointment')
export class AppointmentController {
  constructor(private readonly service: AppointmentService) {}

  //Patients books appointment
  @UseGuards(JwtAuthGuard)
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() body: CreateAppointmentDto, @Req() req) {
    return this.service.create({
      ...body,
      patientId: req.user.userId,
      status: 'pending',
    });
  }

  //Patient views their appointments
  @UseGuards(JwtAuthGuard)
  @Get('my')
  async myAppointments(@Req() req) {
    return this.service.findByPatient(req.user.userId);
  }

  //Patients reschedule their own appointment
  @UseGuards(JwtAuthGuard)
  @Patch('rescheduled/:id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async reschedule(
    @Param('id') id: string,
    @Body() body: RescheduleAppointmentDto,
    @Req() req,
  ) {
    const appt = await this.service.findOne(id);
    console.log('Reschedule attempt:', { id, body, user: req.user, appt });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.patientId !== req.user.userId)
      throw new ForbiddenException('Not your Appointment');
    return this.service.update(id, {
      date: body.date,
      time: body.time,
      status: 'rescheduled',
      rescheduleInfo: { date: body.date, time: body.time },
    });
  }

  // Patient cancels their own appointment
  @UseGuards(JwtAuthGuard)
  @Patch('cancel/:id')
  async cancel(@Param('id') id: string, @Req() req) {
    const appt = await this.service.findOne(id);
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.patientId !== req.user.userId)
      throw new ForbiddenException('Not your Appointment');
    return this.service.update(id, { status: 'cancelled' });
  }

  //Admin views all appointments
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  async all() {
    return this.service.findAll();
  }

  //Admin updates appointment status
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateAppointmentDto) {
    return this.service.update(id, body);
  }
}
