import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { ChatbotModule } from '../chatbot/chatbot.module';

@Module({
  imports: [HttpModule, ChatbotModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
