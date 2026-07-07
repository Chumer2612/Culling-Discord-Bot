const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

let pool;

async function createDatabasePool() {
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    charset: "utf8mb4",
  });

  await pool.query("SELECT 1");
  console.log("[CullingBot] Conectado ao MySQL.");
}

function getPool() {
  if (!pool) {
    throw new Error("Pool MySQL ainda não foi iniciado.");
  }

  return pool;
}

async function ensureDatabaseTables() {
  const pool = getPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS culling_discord_links (
      minecraft_uuid VARCHAR(36) PRIMARY KEY,
      minecraft_name VARCHAR(32) NOT NULL,
      discord_id VARCHAR(32) NOT NULL,
      discord_name VARCHAR(64) NULL,
      linked_by VARCHAR(16) NULL,
      linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_discord_id (discord_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS culling_discord_link_codes (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      minecraft_uuid VARCHAR(36) NOT NULL,
      minecraft_name VARCHAR(32) NOT NULL,
      code VARCHAR(32) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      used TINYINT(1) NOT NULL DEFAULT 0,
      used_at TIMESTAMP NULL,
      discord_id VARCHAR(32) NULL,
      discord_name VARCHAR(64) NULL,
      INDEX idx_code (code),
      INDEX idx_uuid (minecraft_uuid),
      INDEX idx_used (used)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS culling_discord_outbox (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      channel_key VARCHAR(64) NOT NULL,
      title VARCHAR(255) NULL,
      description TEXT NOT NULL,
      embed_color INT NOT NULL DEFAULT 16753920,
      sent TINYINT(1) NOT NULL DEFAULT 0,
      attempts INT NOT NULL DEFAULT 0,
      last_error TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sent_at TIMESTAMP NULL,
      INDEX idx_sent (sent, attempts),
      INDEX idx_channel_key (channel_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS culling_discord_admin_actions (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      discord_id VARCHAR(32) NOT NULL,
      discord_name VARCHAR(64) NULL,
      action_type VARCHAR(64) NOT NULL,
      minecraft_command TEXT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
      attempts INT NOT NULL DEFAULT 0,
      last_error TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP NULL,
      INDEX idx_status (status, attempts),
      INDEX idx_discord_id (discord_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS culling_discord_panels (
      id INT AUTO_INCREMENT PRIMARY KEY,
      panel_type VARCHAR(64) NOT NULL UNIQUE,
      channel_id VARCHAR(36) NOT NULL,
      message_id VARCHAR(36) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS culling_dashboard_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(32) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Seeding inicial para não perder acesso
  const [users] = await pool.execute("SELECT id FROM culling_dashboard_users LIMIT 1");
  if (users.length === 0) {
    const defaultPassword = process.env.DASHBOARD_PASSWORD || "abate123";
    const hashed = await bcrypt.hash(defaultPassword, 10);
    await pool.execute(
      "INSERT INTO culling_dashboard_users (username, password_hash) VALUES (?, ?)",
      ["admin", hashed]
    );
    console.log("[CullingBot] Usuário administrador padrão (admin) criado com a senha do .env!");
  }

  console.log("[CullingBot] Tabelas verificadas/criadas.");
}

module.exports = {
  createDatabasePool,
  ensureDatabaseTables,
  getPool,
};