import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@primecare.health' },
    update: {},
    create: {
      email: 'admin@primecare.health',
      fullName: 'PrimeCare Admin',
      role: Role.ADMIN,
      passwordHash,
    },
  });

  const doctor = await prisma.user.upsert({
    where: { email: 'ada.okonkwo@primecare.health' },
    update: {},
    create: {
      email: 'ada.okonkwo@primecare.health',
      fullName: 'Dr. Ada Okonkwo',
      role: Role.DOCTOR,
      passwordHash,
      phone: '+234 801 111 2233',
      doctorProfile: {
        create: {
          specialty: 'General Practice',
          bio: 'Primary care and telehealth consultations.',
          defaultMeetLink: 'https://meet.google.com/ada-care',
          availability: {
            days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            from: '09:00',
            to: '17:00',
          },
        },
      },
    },
  });

  const patient = await prisma.user.upsert({
    where: { email: 'patient@primecare.health' },
    update: {},
    create: {
      email: 'patient@primecare.health',
      fullName: 'Eze Macaulay',
      role: Role.PATIENT,
      passwordHash,
      phone: '+234 810 111 2222',
    },
  });

  await prisma.catalogItem.createMany({
    data: [
      {
        name: 'Dermatologist',
        type: 'SPECIALTY',
        description: 'Skin, hair and nails treatment.',
        published: true,
        price: 8000,
      },
      {
        name: 'Online Video Call',
        type: 'SERVICE',
        description: 'Standard telehealth video consultation.',
        published: true,
        price: 5000,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      brandName: 'PrimeCare',
      supportEmail: 'support@primecare.health',
      timezone: 'Africa/Lagos',
    },
  });

  console.log('Seeded users:', {
    admin: admin.email,
    doctor: doctor.email,
    patient: patient.email,
    password: 'Password123!',
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
