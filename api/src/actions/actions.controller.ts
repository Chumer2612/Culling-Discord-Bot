import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ActionsService } from './actions.service';
import type { CreateControlActionDto } from './actions.service';
import { AuthGuard } from '../auth/auth.guard';
import { Request } from 'express';

@Controller('actions')
@UseGuards(AuthGuard)
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Post('control')
  async createAction(@Req() req: any, @Body() body: CreateControlActionDto) {
    const staffUser = req.user;
    return this.actionsService.enqueueAction(staffUser, body);
  }

  @Get('control/:id')
  async getStatus(@Param('id') id: string) {
    return this.actionsService.getActionStatus(Number(id));
  }
}
