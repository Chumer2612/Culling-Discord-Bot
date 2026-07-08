import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PlayersService } from './players.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('players')
@UseGuards(AuthGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  async findAll() {
    return {
      success: true,
      data: await this.playersService.findAll(),
    };
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string) {
    return {
      success: true,
      data: await this.playersService.findOne(uuid),
    };
  }
}
