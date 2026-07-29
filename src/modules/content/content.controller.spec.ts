import { NotFoundException } from '@nestjs/common';
import { ContentController } from './content.controller';
import { PrismaService } from '../../prisma/prisma.service';

describe('ContentController', () => {
  let controller: ContentController;
  const prisma = {
    contentBlock: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ContentController(prisma as unknown as PrismaService);
  });

  it('list returns blocks', async () => {
    prisma.contentBlock.findMany.mockResolvedValue([
      { key: 'hero', title: 'T', body: 'B' },
    ]);
    await expect(controller.list()).resolves.toHaveLength(1);
  });

  it('upsert writes block', async () => {
    prisma.contentBlock.upsert.mockResolvedValue({
      key: 'hero',
      title: 'T',
      body: 'B',
    });
    const result = await controller.upsert({
      key: 'hero',
      title: 'T',
      body: 'B',
    });
    expect(result.key).toBe('hero');
  });

  it('update throws when missing', async () => {
    prisma.contentBlock.findUnique.mockResolvedValue(null);
    await expect(
      controller.update('missing', { title: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
