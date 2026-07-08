import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RulesService } from './rules.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('requests')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get()
  getRequests() {
    return this.rulesService.getRequests();
  }

  @Post('manual')
  createManualRequest(@Body() body: any) {
    return this.rulesService.createManualRequest(body);
  }

  @Put(':id/status')
  updateRequestStatus(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.rulesService.updateRequestStatus(id, body, req.user?.username);
  }

  @Put(':id')
  editRequestText(@Param('id') id: string, @Body() body: any) {
    return this.rulesService.editRequestText(id, body);
  }

  @Delete(':id')
  deleteRequest(@Param('id') id: string) {
    return this.rulesService.deleteRequest(id);
  }
}
