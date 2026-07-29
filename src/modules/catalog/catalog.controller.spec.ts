import { NotFoundException } from '@nestjs/common';
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
    },
  };

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
        published: true,
      },
    ]);
    const rows = await controller.list();
    expect(rows[0].type).toBe('specialty');
    expect(rows[0].price).toBe(8000);
  });

  it('create persists item', async () => {
    prisma.catalogItem.create.mockResolvedValue({ id: '1' });
    await controller.create({
      name: 'Derm',
      type: 'specialty',
      description: 'x',
      price: 100,
      published: true,
    });
    expect(prisma.catalogItem.create).toHaveBeenCalled();
  });

  it('update throws when missing', async () => {
    prisma.catalogItem.findUnique.mockResolvedValue(null);
    await expect(
      controller.update('missing', { name: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
