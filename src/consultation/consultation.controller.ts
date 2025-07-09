import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
  UploadedFile,
  UseInterceptors,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { ConsultationService } from './consultation.service';
import { CreateConsultationDto } from 'src/dto/create-consultation.dto';
import { UpdateConsultationDto } from 'src/dto/update-consultation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';

@Controller('consultations')
export class ConsultationController {
  constructor(private readonly service: ConsultationService) {}

  // Patient books consultation (with file upload)
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
    }),
  )
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(
    @Body() body: CreateConsultationDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    return this.service.create({
      ...body,
      patientId: req.user.userId,
      fileUrl: file ? `/uploads/${file.filename}` : undefined,
      fileName: file ? file.originalname : undefined,
      status: 'pending',
    });
  }

  // Patient views their consultations
  @UseGuards(JwtAuthGuard)
  @Get('my')
  async myConsultations(@Req() req) {
    return this.service.findByPatient(req.user.userId);
  }

  //Patients cancels their consultation
  @UseGuards(JwtAuthGuard)
  @Patch('cancel/:id')
  async cancel(@Param('id') id: string, @Req() req) {
    const consult = await this.service.findOne(id);
    if (!consult) throw new NotFoundException('Consultation not found');
    if (consult.patientId !== req.user.userId)
      throw new ForbiddenException('Not your Consultation');
    return this.service.update(id, { status: 'cancelled' });
  }

  // Patient reschedules their own consultation
  @UseGuards(JwtAuthGuard)
  @Patch('reschedule/:id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async reschedule(
    @Param('id') id: string,
    @Body() body: { date: string; time: string },
    @Req() req,
  ) {
    const consult = await this.service.findOne(id);
    if (!consult) throw new NotFoundException('Consultation not found');
    if (consult.patientId !== req.user.userId)
      throw new ForbiddenException('Not your consultation');
    return this.service.update(id, {
      date: body.date,
      time: body.time,
      status: 'rescheduled',
      rescheduleInfo: { date: body.date, time: body.time },
    });
  }

  // Admin views all consultations
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  async all() {
    return this.service.findAll();
  }

  // Admin updates consultation status, adds Google Meet link
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateConsultationDto) {
    return this.service.update(id, body);
  }
}
