import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { IsString, MinLength } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import { MedicalFileSource } from '../../generated/prisma/client';

class CreateNoteDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  patientId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  body!: string;
}

@ApiTags('Records')
@ApiBearerAuth('JWT')
@Controller()
@UseGuards(JwtAuthGuard)
export class RecordsController {
  constructor(private prisma: PrismaService) {}

  @Get('records')
  @ApiOperation({ summary: 'List my medical files' })
  myFiles(@CurrentUser() user: AuthUser) {
    return this.prisma.medicalFile.findMany({
      where: { ownerId: user.userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('records/patient/:patientId')
  @UseGuards(RolesGuard)
  @Roles('doctor', 'admin')
  @ApiOperation({ summary: 'List medical files for a patient' })
  patientFiles(@Param('patientId') patientId: string) {
    return this.prisma.medicalFile.findMany({
      where: { ownerId: patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('records')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a medical file' })
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
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.prisma.medicalFile.create({
      data: {
        ownerId: user.userId,
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        source: MedicalFileSource.UPLOAD,
      },
    });
  }

  @Get('notes/patient/:patientId')
  @UseGuards(RolesGuard)
  @Roles('doctor', 'admin')
  @ApiOperation({ summary: 'List doctor notes for a patient' })
  listNotes(@Param('patientId') patientId: string) {
    return this.prisma.patientNote.findMany({
      where: { patientId },
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('notes')
  @UseGuards(RolesGuard)
  @Roles('doctor')
  @ApiOperation({ summary: 'Create a doctor note for a patient' })
  createNote(@CurrentUser() user: AuthUser, @Body() dto: CreateNoteDto) {
    return this.prisma.patientNote.create({
      data: {
        patientId: dto.patientId,
        authorId: user.userId,
        body: dto.body,
      },
    });
  }
}
