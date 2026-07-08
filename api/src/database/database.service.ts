import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env from parent directory (culling-discord-bot root)
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: mysql.Pool;
  private readonly logger = new Logger(DatabaseService.name);

  async onModuleInit() {
    this.logger.log('Conectando ao MariaDB...');
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'culling_game',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      namedPlaceholders: true,
    });

    try {
      const connection = await this.pool.getConnection();
      this.logger.log('MariaDB conectado com sucesso (NestJS)');
      connection.release();

      await this.ensureStaffTables();
    } catch (err) {
      this.logger.error('Erro ao conectar no banco de dados:', err);
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('Conexão com MariaDB encerrada.');
    }
  }

  getPool(): mysql.Pool {
    return this.pool;
  }

  private async ensureStaffTables() {
    const staffUsersTable = `
      CREATE TABLE IF NOT EXISTS culling_staff_users (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        discord_id VARCHAR(32) NOT NULL UNIQUE,
        discord_name VARCHAR(64) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'VIEWER',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_discord_id (discord_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const staffSessionsTable = `
      CREATE TABLE IF NOT EXISTS culling_staff_sessions (
        session_id VARCHAR(128) PRIMARY KEY,
        discord_id VARCHAR(32) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_discord_id (discord_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    try {
      await this.pool.execute(staffUsersTable);
      await this.pool.execute(staffSessionsTable);
      this.logger.log('Tabelas de staff garantidas.');
    } catch (error) {
      this.logger.error('Erro ao criar tabelas de staff:', error);
    }
  }
}
