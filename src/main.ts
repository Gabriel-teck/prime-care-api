import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //Enable CORS for development
  app.enableCors({
    origin: true, //Allow all origins for development only
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
