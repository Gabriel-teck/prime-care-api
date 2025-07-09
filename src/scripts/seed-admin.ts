import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcryptjs';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(UserService);
  const password = await bcrypt.hash('123456789', 10);
  await userService.create({
    email: 'primecareadmin@email.com',
    password,
    fullName: 'PrimeCare Admin',
    role: 'admin',
  });
  console.log('admin created!');
  await app.close();
}
bootstrap();
