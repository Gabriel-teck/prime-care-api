import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { CatalogType } from '../../generated/prisma/client';

describe('CatalogController', () => {
  let controller: CatalogController;
  const prisma = {
    catalogItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const specialtyFile = {
    filename: 'specialty.png',
    mimetype: 'image/png',
    originalname: 'specialty.png',
  } as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CatalogController(prisma as unknown as PrismaService);
  });

  it('list lowercases type and coerces price', async () => {
    prisma.catalogItem.findMany.mockResolvedValue([
      {
        id: '1',
        name: 'Derm',
        type: CatalogType.SPECIALTY,
        price: 8000,
        description: 'x',
        imageUrl: '/uploads/derm.png',
        published: true,
      },
    ]);
    const rows = await controller.list();
    expect(rows[0].type).toBe('specialty');
    expect(rows[0].price).toBe(8000);
    expect(rows[0].imageUrl).toBe('/uploads/derm.png');
  });

  it('getOne throws when missing', async () => {
    prisma.catalogItem.findUnique.mockResolvedValue(null);
    await expect(controller.getOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create rejects specialty without image', async () => {
    await expect(
      controller.create({
        name: 'Derm',
        type: 'specialty',
        description: 'x',
        published: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.catalogItem.create).not.toHaveBeenCalled();
  });

  it('create persists specialty with image', async () => {
    prisma.catalogItem.create.mockResolvedValue({
      id: '1',
      name: 'Derm',
      type: CatalogType.SPECIALTY,
      price: null,
      currency: 'NGN',
      description: 'x',
      imageUrl: '/uploads/specialty.png',
      published: true,
    });
    await controller.create(
      {
        name: 'Derm',
        type: 'specialty',
        description: 'x',
        price: 100,
        published: true,
      },
      specialtyFile,
    );
    expect(prisma.catalogItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: CatalogType.SPECIALTY,
        price: null,
        imageUrl: '/uploads/specialty.png',
      }),
    });
  });

  it('create stores price for services', async () => {
    prisma.catalogItem.create.mockResolvedValue({
      id: '1',
      name: 'Consult',
      type: CatalogType.SERVICE,
      price: 5000,
      currency: 'NGN',
      description: 'x',
      imageUrl: null,
      published: false,
    });
    await controller.create({
      name: 'Consult',
      type: 'service',
      description: 'x',
      price: 5000,
      currency: 'NGN',
    });
    expect(prisma.catalogItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: CatalogType.SERVICE,
        price: 5000,
        imageUrl: null,
      }),
    });
  });

  it('update throws when missing', async () => {
    prisma.catalogItem.findUnique.mockResolvedValue(null);
    await expect(
      controller.update('missing', { name: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update rejects specialty without image', async () => {
    prisma.catalogItem.findUnique.mockResolvedValue({
      id: '1',
      type: CatalogType.URGENT_CARE,
      imageUrl: null,
      price: null,
    });
    await expect(
      controller.update('1', { type: 'specialty' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.catalogItem.update).not.toHaveBeenCalled();
  });

  it('remove deletes item', async () => {
    prisma.catalogItem.findUnique.mockResolvedValue({ id: '1' });
    prisma.catalogItem.delete.mockResolvedValue({ id: '1' });
    await expect(controller.remove('1')).resolves.toEqual({ ok: true });
    expect(prisma.catalogItem.delete).toHaveBeenCalledWith({
      where: { id: '1' },
    });
  });
});
