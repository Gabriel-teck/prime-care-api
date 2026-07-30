import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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

  @ApiProperty({
    example: 'specialty',
    enum: ['specialty', 'urgent_care', 'service'],
  })
  @IsString()
  type!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  price?: number | null;

  @ApiPropertyOptional({ example: 'NGN' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private prisma: PrismaService) {}

  private parseType(raw: string): CatalogType {
    const normalized = raw
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
    if (
      normalized !== CatalogType.SPECIALTY &&
      normalized !== CatalogType.URGENT_CARE &&
      normalized !== CatalogType.SERVICE
    ) {
      throw new BadRequestException(`Invalid catalog type: ${raw}`);
    }
    return normalized as CatalogType;
  }

  private serialize<T extends { type: CatalogType; price: unknown }>(row: T) {
    return {
      ...row,
      type: row.type.toLowerCase(),
      price: row.price != null ? Number(row.price) : null,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List catalog items (public)' })
  async list() {
    const rows = await this.prisma.catalogItem.findMany({
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a catalog item by id (public)' })
  async getOne(@Param('id') id: string) {
    const row = await this.prisma.catalogItem.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Catalog item not found');
    return this.serialize(row);
  }

  @Post()
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create a catalog item (admin)' })
  async create(@Body() dto: CreateCatalogDto) {
    const type = this.parseType(dto.type);
    const row = await this.prisma.catalogItem.create({
      data: {
        name: dto.name,
        type,
        description: dto.description,
        price: type === CatalogType.SERVICE ? (dto.price ?? null) : null,
        currency: dto.currency || 'NGN',
        published: dto.published ?? false,
      },
    });
    return this.serialize(row);
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

    const nextType = dto.type ? this.parseType(dto.type) : existing.type;
    const isService = nextType === CatalogType.SERVICE;

    let price: number | null | undefined = dto.price;
    if (dto.type && !isService) {
      price = null;
    } else if (isService && dto.price === undefined && existing.price == null) {
      price = undefined;
    }

    const row = await this.prisma.catalogItem.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        published: dto.published,
        currency: dto.currency,
        type: dto.type ? nextType : undefined,
        price,
      },
    });
    return this.serialize(row);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a catalog item (admin)' })
  async remove(@Param('id') id: string) {
    const existing = await this.prisma.catalogItem.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Catalog item not found');
    await this.prisma.catalogItem.delete({ where: { id } });
    return { ok: true };
  }
}
