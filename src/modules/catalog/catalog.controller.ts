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
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CatalogType } from '../../generated/prisma/client';

const IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

const catalogImageStorage = {
  storage: diskStorage({
    destination: './uploads',
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(
        new BadRequestException(
          'Image must be PNG, JPEG, WebP, or SVG',
        ) as unknown as Error,
        false,
      );
      return;
    }
    cb(null, true);
  },
};

function toBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}

function toNumber(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

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
  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  price?: number | null;

  @ApiPropertyOptional({ example: 'NGN' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
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

  private serialize<
    T extends { type: CatalogType; price: unknown; imageUrl?: string | null },
  >(row: T) {
    return {
      ...row,
      type: row.type.toLowerCase(),
      price: row.price != null ? Number(row.price) : null,
      imageUrl: row.imageUrl ?? null,
    };
  }

  private imagePath(file?: Express.Multer.File): string | undefined {
    if (!file) return undefined;
    return `/uploads/${file.filename}`;
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
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'type', 'description'],
      properties: {
        name: { type: 'string' },
        type: {
          type: 'string',
          enum: ['specialty', 'urgent_care', 'service'],
        },
        description: { type: 'string' },
        price: { type: 'number', nullable: true },
        currency: { type: 'string' },
        published: { type: 'boolean' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Create a catalog item (admin)' })
  @UseInterceptors(FileInterceptor('image', catalogImageStorage))
  async create(
    @Body() dto: CreateCatalogDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const type = this.parseType(dto.type);
    const imageUrl = this.imagePath(file) ?? null;

    if (type === CatalogType.SPECIALTY && !imageUrl) {
      throw new BadRequestException('Specialty items require an image');
    }

    const row = await this.prisma.catalogItem.create({
      data: {
        name: dto.name,
        type,
        description: dto.description,
        price: type === CatalogType.SERVICE ? (dto.price ?? null) : null,
        currency: dto.currency || 'NGN',
        published: dto.published ?? false,
        imageUrl,
      },
    });
    return this.serialize(row);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: {
          type: 'string',
          enum: ['specialty', 'urgent_care', 'service'],
        },
        description: { type: 'string' },
        price: { type: 'number', nullable: true },
        currency: { type: 'string' },
        published: { type: 'boolean' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Update a catalog item (admin)' })
  @UseInterceptors(FileInterceptor('image', catalogImageStorage))
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCatalogDto>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const existing = await this.prisma.catalogItem.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Catalog item not found');

    const nextType = dto.type ? this.parseType(dto.type) : existing.type;
    const isService = nextType === CatalogType.SERVICE;
    const nextImageUrl = this.imagePath(file) ?? existing.imageUrl ?? null;

    if (nextType === CatalogType.SPECIALTY && !nextImageUrl) {
      throw new BadRequestException('Specialty items require an image');
    }

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
        imageUrl: this.imagePath(file) ?? undefined,
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
