import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ConsultationsService } from './consultations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import {
  CreateConsultationDto,
  RescheduleConsultationDto,
  UpdateConsultationDto,
} from './dto/consultation.dto';

@ApiTags('Consultations')
@ApiBearerAuth('JWT')
@Controller('consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {
  constructor(private consultations: ConsultationsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        email: { type: 'string' },
        phoneNumber: { type: 'string' },
        consultationType: { type: 'string' },
        date: { type: 'string' },
        time: { type: 'string' },
        reason: { type: 'string' },
        doctorId: { type: 'string', format: 'uuid' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Book an online consultation (optional file)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateConsultationDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.consultations.create(user, dto, file);
  }

  @Get('doctors')
  @ApiOperation({ summary: 'List doctors available for consultation booking' })
  doctors() {
    return this.consultations.doctors();
  }

  @Get('my')
  @ApiOperation({ summary: 'List my consultations' })
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'pending | confirmed | completed | cancelled | rescheduled | all',
  })
  my(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.consultations.my(user, status);
  }

  @Get('doctor/my')
  @UseGuards(RolesGuard)
  @Roles('doctor')
  @ApiOperation({ summary: 'List consultations assigned to the doctor' })
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'pending | confirmed | completed | cancelled | rescheduled | all',
  })
  doctorMine(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.consultations.doctorMine(user, status);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List all consultations (admin)' })
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'pending | confirmed | completed | cancelled | rescheduled | all',
  })
  all(@Query('status') status?: string) {
    return this.consultations.all(status);
  }

  @Patch('cancel/:id')
  @ApiOperation({ summary: 'Cancel a consultation' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.consultations.cancel(user, id);
  }

  @Patch('reschedule/:id')
  @ApiOperation({ summary: 'Reschedule a consultation' })
  reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RescheduleConsultationDto,
  ) {
    return this.consultations.reschedule(user, id, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'doctor')
  @ApiOperation({ summary: 'Update status / Meet link / doctor assignment' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateConsultationDto,
  ) {
    return this.consultations.update(user, id, dto);
  }
}
