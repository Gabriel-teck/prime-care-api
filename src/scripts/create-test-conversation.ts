import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ChatService } from '../chat/chat.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const chatService = app.get(ChatService);

  // Get admin and patient IDs
  const adminId = '4e0a4401-c205-4bdb-8edf-3d6c24bf6951'; // PrimeCare Admin
  const patientId = 'db0d2796-fa91-4a39-96a5-061b18303b1c'; // careers.gabriel@gmail.com

  try {
    // Create a conversation
    const conversation = await chatService.getOrCreateConversation(
      patientId,
      adminId,
    );
    console.log('Created conversation:', conversation.id);

    // Add some test messages
    await chatService.sendMessage(
      conversation.id,
      'patient',
      patientId,
      'Hello doctor, I need help with my symptoms.',
    );
    await chatService.sendMessage(
      conversation.id,
      'admin',
      adminId,
      "Hello! I'm here to help. What symptoms are you experiencing?",
    );
    await chatService.sendMessage(
      conversation.id,
      'patient',
      patientId,
      'I have been feeling dizzy and tired for the past few days.',
    );
    await chatService.sendMessage(
      conversation.id,
      'admin',
      adminId,
      'I understand. Let me ask you a few questions to better assess your condition.',
    );

    console.log('Test conversation created successfully!');
  } catch (error) {
    console.error('Error creating test conversation:', error);
  }

  await app.close();
}

bootstrap();
