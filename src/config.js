const { Client, GatewayIntentBits } = require("discord.js");

const REQUIRED_ENV = [
  "DISCORD_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_GUILD_ID",
  "MYSQL_HOST",
  "MYSQL_DATABASE",
  "MYSQL_USER",
  "MYSQL_PASSWORD",
  "BOT_ADMIN_USER_IDS",
  "BOT_ADMIN_CHANNEL_IDS",
  "ROLE_JOGADORES",
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key] || process.env[key].trim() === "") {
    console.error(`[CullingBot] Variável ausente no .env: ${key}`);
    process.exit(1);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

const CHANNELS = {
  ABATE_CHAT: process.env.CHANNEL_ABATE_CHAT,
  REGRAS: process.env.CHANNEL_REGRAS,
  ANUNCIOS: process.env.CHANNEL_ANUNCIOS,
  LEADERBOARD: process.env.CHANNEL_LEADERBOARD,
  ELIMINADOS: process.env.CHANNEL_ELIMINADOS,
  BOSSES: process.env.CHANNEL_BOSSES,

  STAFF: process.env.CHANNEL_STAFF,
  PEDIDOS: process.env.CHANNEL_PEDIDOS,
  CONDICOES_VITORIA: process.env.CHANNEL_CONDICOES_VITORIA,
  REGRAS_PENDENTES: process.env.CHANNEL_REGRAS_PENDENTES,
  LOGS: process.env.CHANNEL_LOGS,
  ADMIN_COMANDOS: process.env.CHANNEL_ADMIN_COMANDOS,
};

function parseIdList(value) {
  if (!value || value.trim() === "") {
    return new Set();
  }

  return new Set(
    value
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
  );
}

const ADMIN_USER_IDS = parseIdList(process.env.BOT_ADMIN_USER_IDS);
const ADMIN_CHANNEL_IDS = parseIdList(process.env.BOT_ADMIN_CHANNEL_IDS);

const ROLES = {
  JOGADORES: process.env.ROLE_JOGADORES,
};

module.exports = {
  client,
  CHANNELS,
  ADMIN_USER_IDS,
  ADMIN_CHANNEL_IDS,
  ROLES,
};