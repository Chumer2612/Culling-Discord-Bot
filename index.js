require("dotenv").config({ quiet: true });

process.on("uncaughtException", (err) => {
  console.error("[CullingBot] Erro Crítico (uncaughtException):", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("[CullingBot] Promessa Rejeitada (unhandledRejection):", reason);
});

const { Events } = require("discord.js");

const { client } = require("./src/config");
const { createDatabasePool, ensureDatabaseTables } = require("./src/database");
const { registerCommands } = require("./src/registerCommands");
const { processDiscordOutbox, cleanupDiscordOutbox } = require("./src/outbox");
const {
  deleteExpiredCodes,
  handleInteraction,
  handleMessageCreate,
} = require("./src/commands/publicCommands");
const { cleanupAdminActions } = require("./src/adminActions");
const { runHealthMonitor } = require("./src/healthMonitor");
const { checkDiscordLinked } = require("./src/security");
const { startServer } = require("./src/server");

client.once(Events.ClientReady, async (c) => {
  console.log(`[CullingBot] Logado como ${c.user.tag}`);

  setInterval(processDiscordOutbox, 3000);
  
  // Inicia o Dashboard na porta 3000 (ou a do .env)
  startServer(process.env.PORT || 3000);

  setInterval(deleteExpiredCodes, 5 * 60 * 1000);
  setInterval(cleanupDiscordOutbox, 10 * 60 * 1000);
  setInterval(cleanupAdminActions, 60 * 60 * 1000);
  setTimeout(runHealthMonitor, 30 * 1000);
  setInterval(runHealthMonitor, 5 * 60 * 1000);
  

  console.log("[CullingBot] Processador de mensagens Discord iniciado.");
});

client.on("guildCreate", async (guild) => {
  if (guild.id !== process.env.DISCORD_GUILD_ID) {
    console.log(
      `[CullingBot] Servidor não autorizado: ${guild.name} (${guild.id}). Saindo...`
    );
    await guild.leave();
  }
});

client.on(Events.InteractionCreate, handleInteraction);
client.on(Events.MessageCreate, handleMessageCreate);

async function start() {
  await createDatabasePool();
  await ensureDatabaseTables();
  await registerCommands();
  await client.login(process.env.DISCORD_TOKEN);
}

start().catch((error) => {
  console.error("[CullingBot] Erro ao iniciar:", error);
  process.exit(1);
});