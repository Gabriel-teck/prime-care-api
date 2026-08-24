import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersRegisterController } from './users-register.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsersController, UsersRegisterController],
})
export class UsersModule {}
