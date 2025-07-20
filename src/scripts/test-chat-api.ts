import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ChatService } from '../chat/chat.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const chatService = app.get(ChatService);
  const userService = app.get(UserService);
  const jwtService = app.get(JwtService);

  try {
    console.log('Testing chat API and socket functionality...');

    // Test 1: Check if admin exists
    const admin = await userService.findByEmail('primecareadmin@email.com');
    console.log('Admin found:', admin ? 'Yes' : 'No');

    // Test 2: Check if patient exists
    const patient = await userService.findByEmail('careers.gabriel@gmail.com');
    console.log('Patient found:', patient ? 'Yes' : 'No');

    // Test 3: Generate JWT token for patient
    if (patient) {
      const payload = {
        email: patient.email,
        userId: patient.id,
        role: patient.role,
      };

      try {
        const token = jwtService.sign(payload);
        console.log(
          'Generated JWT token for patient:',
          token.substring(0, 50) + '...',
        );

        // Test 4: Check existing conversations
        const conversations = await chatService.getUserConversations(
          patient.id,
          'patient',
        );
        console.log('Patient conversations:', conversations.length);

        // Test 5: Get messages from first conversation
        if (conversations.length > 0) {
          const messages = await chatService.getMessages(conversations[0].id);
          console.log('Messages in first conversation:', messages.length);

          // Test 6: Send a test message
          const testMessage = await chatService.sendMessage(
            conversations[0].id,
            'patient',
            patient.id,
            'Test message from API',
          );
          console.log('Test message sent:', testMessage.content);
        }
      } catch (jwtError) {
        console.error('JWT token generation failed:', jwtError);
      }
    }

    // Test 7: Check admin conversations
    if (admin) {
      const adminConversations = await chatService.getUserConversations(
        admin.id,
        'admin',
      );
      console.log('Admin conversations:', adminConversations.length);
    }

    console.log('Chat API test completed successfully!');
  } catch (error) {
    console.error('Chat API test failed:', error);
  }

  await app.close();
}

bootstrap();
