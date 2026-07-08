import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly db: DatabaseService) {}

  getDiscordOAuthUrl(): string {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/discord/callback');
    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify`;
  }

  async handleDiscordCallback(code: string): Promise<string> {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/discord/callback';

    const params = new URLSearchParams();
    params.append('client_id', clientId || '');
    params.append('client_secret', clientSecret || '');
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    // Get token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!tokenResponse.ok) {
      this.logger.error('Failed to exchange code for token', await tokenResponse.text());
      throw new UnauthorizedException('Discord OAuth2 code exchange failed');
    }

    const tokenData = await tokenResponse.json();

    // Get user
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) {
      throw new UnauthorizedException('Failed to fetch Discord user');
    }

    const userData = await userResponse.json();
    const discordId = userData.id;
    const discordName = userData.username;

    return this.createOrUpdateSession(discordId, discordName, tokenData);
  }

  private async createOrUpdateSession(discordId: string, discordName: string, tokenData: any): Promise<string> {
    const pool = this.db.getPool();

    // Ensure user exists
    await pool.execute(
      `
      INSERT INTO culling_staff_users (discord_id, discord_name)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE discord_name = VALUES(discord_name)
      `,
      [discordId, discordName]
    );

    // Create session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    await pool.execute(
      `
      INSERT INTO culling_staff_sessions (session_id, discord_id, access_token, refresh_token, expires_at)
      VALUES (?, ?, ?, ?, ?)
      `,
      [sessionId, discordId, tokenData.access_token, tokenData.refresh_token, expiresAt]
    );

    return sessionId;
  }

  async validateSession(sessionId: string): Promise<any> {
    if (!sessionId) throw new UnauthorizedException();

    const pool = this.db.getPool();
    const [rows]: any = await pool.execute(
      `
      SELECT u.discord_id, u.discord_name, u.role, s.expires_at
      FROM culling_staff_sessions s
      JOIN culling_staff_users u ON s.discord_id = u.discord_id
      WHERE s.session_id = ?
      LIMIT 1
      `,
      [sessionId]
    );

    if (rows.length === 0) {
      throw new UnauthorizedException('Sessão inválida');
    }

    const session = rows[0];

    if (new Date(session.expires_at) < new Date()) {
      await pool.execute('DELETE FROM culling_staff_sessions WHERE session_id = ?', [sessionId]);
      throw new UnauthorizedException('Sessão expirada');
    }

    return {
      discordId: session.discord_id,
      discordName: session.discord_name,
      role: session.role,
    };
  }
}
