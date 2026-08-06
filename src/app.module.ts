import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ConsultationsModule } from './modules/consultations/consultations.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { ChatModule } from './modules/chat/chat.module';
import { StaffModule } from './modules/staff/staff.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { RecordsModule } from './modules/records/records.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ContactModule } from './modules/contact/contact.module';
import { CallsModule } from './modules/calls/calls.module';
import { SettingsModule } from './modules/settings/settings.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    AppointmentsModule,
    ConsultationsModule,
    BookingsModule,
    ChatModule,
    CallsModule,
    StaffModule,
    PaymentsModule,
    CatalogModule,
    RecordsModule,
    ContactModule,
    SettingsModule,
  ],
})
export class AppModule {}
