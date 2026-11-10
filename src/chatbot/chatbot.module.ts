import { Module } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { TelegramModule } from '../telegram/telegram.module';
import { EstadoModule } from '../estado/estado.module';
import { GraphqlModule } from '../graphql/graphql.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [WhatsappModule, TelegramModule, EstadoModule, GraphqlModule, EmailModule],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
