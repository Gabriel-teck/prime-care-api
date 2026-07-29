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
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CatalogType } from '../../generated/prisma/client';

class CreateCatalogDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'specialty' })
  @IsString()
  type!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List catalog items (public)' })
  async list() {
    const rows = await this.prisma.catalogItem.findMany({
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => ({
      ...r,
      type: r.type.toLowerCase(),
      price: r.price != null ? Number(r.price) : null,
    }));
  }

  @Post()
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create a catalog item (admin)' })
  create(@Body() dto: CreateCatalogDto) {
    return this.prisma.catalogItem.create({
      data: {
        name: dto.name,
        type: dto.type.toUpperCase() as CatalogType,
        description: dto.description,
        price: dto.price,
        published: dto.published ?? false,
      },
    });
  }

  @Patch(':id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update a catalog item (admin)' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCatalogDto>,
  ) {
    const existing = await this.prisma.catalogItem.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Catalog item not found');
    return this.prisma.catalogItem.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        published: dto.published,
        type: dto.type ? (dto.type.toUpperCase() as CatalogType) : undefined,
      },
    });
  }
}
