import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';

type AuthLoginBody = {
  access_token: string;
  user: { role: string; email?: string };
};

describe('PrimeCare API smoke (e2e)', () => {
  let app: INestApplication<App>;
  let patientToken = '';
  let adminToken = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in seeded patient', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'patient@primecare.health',
        password: 'Password123!',
      })
      .expect(201);

    const body = res.body as AuthLoginBody;
    expect(body.access_token).toBeDefined();
    expect(body.user.role).toBe('patient');
    patientToken = body.access_token;
  });

  it('logs in seeded admin', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@primecare.health',
        password: 'Password123!',
      })
      .expect(201);

    const body = res.body as AuthLoginBody;
    expect(body.user.role).toBe('admin');
    adminToken = body.access_token;
  });

  it('returns /users/me for patient', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect((res.body as { email: string }).email).toBe(
      'patient@primecare.health',
    );
  });

  it('creates and lists patient appointment', async () => {
    await request(app.getHttpServer())
      .post('/appointment')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        fullName: 'Eze Macaulay',
        email: 'patient@primecare.health',
        phoneNumber: '+2348101112222',
        appointmentType: 'General',
        date: '2026-08-01',
        time: '10:00',
        reason: 'Checkup',
      })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/appointment/my')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    const rows = list.body as unknown[];
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('lists patients for admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('lists staff doctors for admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/staff?role=doctor')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const staff = res.body as { email: string }[];
    expect(staff.some((s) => s.email.includes('ada'))).toBe(true);
  });

  it('rejects Google auth without client id configured', async () => {
    await request(app.getHttpServer())
      .post('/auth/google')
      .send({ idToken: 'invalid' })
      .expect((res) => {
        expect([400, 401]).toContain(res.status);
      });
  });

  it('returns payments chat-access for patient', async () => {
    const res = await request(app.getHttpServer())
      .get('/payments/chat-access')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(typeof (res.body as { entitled: boolean }).entitled).toBe('boolean');
  });

  it('lists catalog items', async () => {
    const res = await request(app.getHttpServer()).get('/catalog').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('lists content blocks', async () => {
    const res = await request(app.getHttpServer()).get('/content').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
