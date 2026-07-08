import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class StatsService {
  constructor(private readonly db: DatabaseService) {}

  async getStats() {
    try {
      const [playersResult] = await this.db.query('SELECT COUNT(*) as total_players, SUM(CASE WHEN lives = 0 THEN 1 ELSE 0 END) as eliminated FROM culling_players');
      const [requestsResult] = await this.db.query('SELECT COUNT(*) as total_requests FROM culling_victory_requests WHERE status = "PENDING"');
      const [fameResult] = await this.db.query('SELECT name, fame FROM culling_players ORDER BY fame DESC LIMIT 1');

      const data = (playersResult as any[])[0] || { total_players: 0, eliminated: 0 };
      const requestsData = (requestsResult as any[])[0] || { total_requests: 0 };
      const fameData = (fameResult as any[])[0] || { name: 'Nenhum', fame: 0 };

      return {
        totalPlayers: data.total_players,
        eliminated: data.eliminated,
        highestFame: {
          name: fameData.name,
          fame: fameData.fame
        },
        pendingRequests: requestsData.total_requests
      };
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar estatísticas');
    }
  }

  async getActivities() {
    try {
      const [killsResult] = await this.db.query(`
        SELECT id, 'kill' as type, killer_name, victim_name, created_at
        FROM culling_kills
        ORDER BY created_at DESC
        LIMIT 10
      `);

      const [actionsResult] = await this.db.query(`
        SELECT id, 'admin_action' as type, discord_name, minecraft_command, created_at
        FROM culling_discord_admin_actions
        ORDER BY created_at DESC
        LIMIT 10
      `);

      const activities = [...(killsResult as any[]), ...(actionsResult as any[])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 15);

      return activities;
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar atividades');
    }
  }
}
