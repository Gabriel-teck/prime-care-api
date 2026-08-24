import { PaymentsController } from './payments.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus } from '../../generated/prisma/client';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  const prisma = {
    payment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PaymentsController(prisma as unknown as PrismaService);
  });

  it('list maps admin payment rows', async () => {
    prisma.payment.findMany.mockResolvedValue([
      {
        id: 'pay1',
        amount: 25,
        currency: 'USD',
        method: 'Card',
        status: PaymentStatus.PAID,
        description: 'Chat',
        chatEntitled: true,
        createdAt: new Date(),
        user: { fullName: 'P', email: 'p@x.com' },
      },
    ]);
    const rows = await controller.list();
    expect(rows[0].status).toBe('paid');
    expect(rows[0].patientEmail).toBe('p@x.com');
  });

  it('my returns patient payments', async () => {
    prisma.payment.findMany.mockResolvedValue([
      {
        id: 'pay1',
        amount: 25,
        currency: 'USD',
        method: 'Card',
        status: PaymentStatus.PAID,
        description: 'Chat',
        chatEntitled: true,
        createdAt: new Date(),
      },
    ]);
    const rows = await controller.my({
      userId: 'p1',
      email: 'p@x.com',
      role: 'patient',
    });
    expect(rows[0].chatEntitled).toBe(true);
  });

  it('unlockChat creates entitled payment', async () => {
    prisma.payment.create.mockResolvedValue({
      id: 'pay1',
      amount: 25,
      chatEntitled: true,
    });
    const result = await controller.unlockChat({
      userId: 'p1',
      email: 'p@x.com',
      role: 'patient',
    });
    expect(result.chatEntitled).toBe(true);
    expect(result.status).toBe('paid');
  });

  it('chatAccess returns entitled flag', async () => {
    prisma.payment.findFirst.mockResolvedValue({ id: 'pay1' });
    await expect(
      controller.chatAccess({
        userId: 'p1',
        email: 'p@x.com',
        role: 'patient',
      }),
    ).resolves.toEqual({ entitled: true });
  });
});
