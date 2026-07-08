import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PlayersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(): Promise<any[]> {
    const pool = this.db.getPool();
    const [rows]: any = await pool.execute(
      `
      SELECT p.uuid, p.name, p.fame, p.lives, p.eliminated, p.allowed, p.created_at, p.updated_at,
             d.discord_id, d.discord_name
      FROM culling_players p
      LEFT JOIN culling_discord_links d ON d.minecraft_uuid = p.uuid
      ORDER BY p.fame DESC
      `
    );
    return rows;
  }

  async findOne(uuid: string): Promise<any> {
    const pool = this.db.getPool();
    const [rows]: any = await pool.execute(
      `
      SELECT p.uuid, p.name, p.fame, p.lives, p.eliminated, p.allowed, p.created_at, p.updated_at,
             d.discord_id, d.discord_name
      FROM culling_players p
      LEFT JOIN culling_discord_links d ON d.minecraft_uuid = p.uuid
      WHERE p.uuid = ?
      LIMIT 1
      `,
      [uuid]
    );

    if (rows.length === 0) {
      throw new NotFoundException('Jogador não encontrado');
    }

    return rows[0];
  }
}
