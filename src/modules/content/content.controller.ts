import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class ContentDto {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty()
  @IsString()
  body!: string;
}

class UpdateContentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;
}

@ApiTags('Content')
@Controller('content')
export class ContentController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List content blocks (public)' })
  list() {
    return this.prisma.contentBlock.findMany({ orderBy: { key: 'asc' } });
  }

  @Post()
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create or update a content block (admin)' })
  upsert(@Body() dto: ContentDto) {
    return this.prisma.contentBlock.upsert({
      where: { key: dto.key },
      create: dto,
      update: { title: dto.title, body: dto.body },
    });
  }

  @Patch(':key')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Patch a content block by key (admin)' })
  async update(@Param('key') key: string, @Body() dto: UpdateContentDto) {
    const existing = await this.prisma.contentBlock.findUnique({
      where: { key },
    });
    if (!existing) throw new NotFoundException('Content block not found');
    return this.prisma.contentBlock.update({
      where: { key },
      data: { title: dto.title, body: dto.body },
    });
  }
}
