import { RecordsController } from './records.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { MedicalFileSource } from '../../generated/prisma/client';

describe('RecordsController', () => {
  let controller: RecordsController;
  const prisma = {
    medicalFile: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    patientNote: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new RecordsController(prisma as unknown as PrismaService);
  });

  it('myFiles lists owner files', async () => {
    prisma.medicalFile.findMany.mockResolvedValue([{ id: 'f1' }]);
    const rows = await controller.myFiles({
      userId: 'p1',
      email: 'p@x.com',
      role: 'patient',
    });
    expect(rows).toHaveLength(1);
  });

  it('patientFiles lists by patient id', async () => {
    prisma.medicalFile.findMany.mockResolvedValue([{ id: 'f1' }]);
    await expect(controller.patientFiles('p1')).resolves.toHaveLength(1);
  });

  it('upload creates medical file', async () => {
    prisma.medicalFile.create.mockResolvedValue({
      id: 'f1',
      source: MedicalFileSource.UPLOAD,
    });
    const result = await controller.upload(
      { userId: 'p1', email: 'p@x.com', role: 'patient' },
      {
        originalname: 'lab.pdf',
        filename: 'lab.pdf',
      } as Express.Multer.File,
    );
    expect(result.source).toBe(MedicalFileSource.UPLOAD);
  });

  it('listNotes returns notes', async () => {
    prisma.patientNote.findMany.mockResolvedValue([{ id: 'n1' }]);
    await expect(controller.listNotes('p1')).resolves.toHaveLength(1);
  });

  it('createNote stores note', async () => {
    prisma.patientNote.create.mockResolvedValue({ id: 'n1', body: 'ok' });
    const result = await controller.createNote(
      { userId: 'd1', email: 'd@x.com', role: 'doctor' },
      { patientId: 'p1', body: 'ok' },
    );
    expect(result.body).toBe('ok');
  });
});
