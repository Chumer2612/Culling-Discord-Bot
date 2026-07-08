import { Controller, Get, Query, Res, Req, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('discord/login')
  login(@Res() res: Response) {
    const url = this.authService.getDiscordOAuthUrl();
    res.redirect(url);
  }

  @Get('discord/callback')
  async callback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      throw new UnauthorizedException('Código OAuth2 não fornecido.');
    }

    const sessionId = await this.authService.handleDiscordCallback(code);

    res.cookie('staff_session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to dashboard frontend (assumed running on 3001 or similar)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(frontendUrl);
  }

  @Get('me')
  async getMe(@Req() req: Request) {
    const sessionId = req.cookies['staff_session_id'];
    const user = await this.authService.validateSession(sessionId);
    return { success: true, user };
  }

  @Get('logout')
  logout(@Res() res: Response) {
    res.clearCookie('staff_session_id');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(frontendUrl);
  }
}
