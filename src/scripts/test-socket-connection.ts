import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    console.log('Testing WebSocket server...');

    // Check if the server is running by testing the HTTP endpoint
    const response = await fetch('http://localhost:3001/chat/conversations', {
      headers: {
        Authorization: 'Bearer test',
      },
    });

    console.log('HTTP endpoint response status:', response.status);

    if (response.status === 401) {
      console.log(
        '✅ HTTP server is running (401 is expected for invalid token)',
      );
    } else {
      console.log('❌ HTTP server not responding properly');
    }

    console.log(
      'WebSocket server should be running on ws://localhost:3001/chat',
    );
    console.log('You can test the socket connection from the frontend now.');
  } catch (error) {
    console.error('Test failed:', error);
  }

  await app.close();
}

bootstrap();
