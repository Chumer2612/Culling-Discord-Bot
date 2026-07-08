import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('channels')
  getChannels() {
    return this.chatService.getChannels();
  }

  @Post('send')
  sendMessage(@Body() body: any) {
    return this.chatService.sendMessage(body);
  }
}
