const { EmbedBuilder } = require("discord.js");
const { getPool } = require("../database");
const { requireBotAdmin } = require("../security");

function safe(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/`/g, "'");
}

function limitText(value, maxLength = 900) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "Sem informação.";
  }

  const text = String(value);
  return text.length <= maxLength ? text : text.slice(0, maxLength - 3) + "...";
}

function discordTimestamp(value) {
  if (!value) return "Nunca";

  const date = value instanceof Date ? value : new Date(value);
  const seconds = Math.floor(date.getTime() / 1000);

  if (!Number.isFinite(seconds)) return "Data inválida";

  return `<t:${seconds}:F>`;
}

function statusEmoji(status) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "DONE") return "✅";
  if (normalized === "FAILED") return "❌";
  if (normalized === "PENDING") return "⏳";
  if (normalized === "PROCESSING") return "🔄";

  return "📌";
}

async function handleBotStatus(interaction) {
  if (!(await requireBotAdmin(interaction))) return;

  await interaction.deferReply({ flags: 64 });

  const pool = getPool();

  const [[mysqlPing]] = await pool.execute("SELECT NOW() AS now_time");

  const [[outbox]] = await pool.execute(
    `
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN attempts >= 5 THEN 1 ELSE 0 END), 0) AS failed_like,
      COALESCE(MIN(created_at), NULL) AS oldest_created_at
    FROM culling_discord_outbox
    WHERE sent = 0
    `
  );

  const [[actions]] = await pool.execute(
    `
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending,
      COALESCE(SUM(CASE WHEN status = 'PROCESSING' THEN 1 ELSE 0 END), 0) AS processing,
      COALESCE(SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END), 0) AS done,
      COALESCE(SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END), 0) AS failed,
      MAX(created_at) AS last_created_at,
      MAX(processed_at) AS last_processed_at
    FROM culling_discord_admin_actions
    `
  );

  const [[oldPending]] = await pool.execute(
    `
    SELECT COUNT(*) AS total
    FROM culling_discord_admin_actions
    WHERE status IN ('PENDING', 'PROCESSING')
      AND created_at < (NOW() - INTERVAL 5 MINUTE)
    `
  );

  let health = "✅ Normal";

  if (Number(actions.failed) > 0 || Number(outbox.failed_like) > 0) {
    health = "⚠️ Atenção";
  }

  if (Number(oldPending.total) > 0) {
    health = "❌ Possível fila travada";
  }

  const embed = new EmbedBuilder()
    .setTitle("🩺 Status do Bot Kogane")
    .setColor(health.startsWith("✅") ? 0x33cc66 : health.startsWith("⚠️") ? 0xffaa00 : 0xcc0000)
    .setDescription(
      `**Estado geral:** ${health}\n\n` +
        `**Bot:** \`online\`\n` +
        `**MySQL:** \`OK\`\n` +
        `**Hora MySQL:** ${discordTimestamp(mysqlPing.now_time)}\n\n` +
        `**Outbox Discord pendente:** \`${outbox.total}\`\n` +
        `**Outbox com erro/5 tentativas:** \`${outbox.failed_like}\`\n` +
        `**Outbox mais antiga:** ${discordTimestamp(outbox.oldest_created_at)}\n\n` +
        `**Ações admin totais:** \`${actions.total}\`\n` +
        `**PENDING:** \`${actions.pending}\`\n` +
        `**PROCESSING:** \`${actions.processing}\`\n` +
        `**DONE:** \`${actions.done}\`\n` +
        `**FAILED:** \`${actions.failed}\`\n` +
        `**Pendentes há +5 min:** \`${oldPending.total}\`\n\n` +
        `**Última ação criada:** ${discordTimestamp(actions.last_created_at)}\n` +
        `**Última ação processada:** ${discordTimestamp(actions.last_processed_at)}`
    )
    .setFooter({ text: "Jogo do Abate • Auditoria" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleAcoes(interaction) {
  if (!(await requireBotAdmin(interaction))) return;

  await interaction.deferReply({ flags: 64 });

  const pool = getPool();

  const status = interaction.options.getString("status", false) || "ALL";
  const limitRaw = interaction.options.getInteger("limite", false) || 10;
  const limit = Math.max(1, Math.min(20, limitRaw));

  let rows;

  if (status === "ALL") {
    const [result] = await pool.execute(
      `
      SELECT id, discord_name, action_type, minecraft_command, status, attempts, last_error, created_at, processed_at
      FROM culling_discord_admin_actions
      ORDER BY id DESC
      LIMIT ${limit}
      `
    );
    rows = result;
  } else {
    const [result] = await pool.execute(
      `
      SELECT id, discord_name, action_type, minecraft_command, status, attempts, last_error, created_at, processed_at
      FROM culling_discord_admin_actions
      WHERE status = ?
      ORDER BY id DESC
      LIMIT ${limit}
      `,
      [status]
    );
    rows = result;
  }

  if (rows.length === 0) {
    await interaction.editReply(`📭 Nenhuma ação encontrada para o filtro **${status}**.`);
    return;
  }

  const description = rows
    .map((action) => {
      return (
        `${statusEmoji(action.status)} **#${action.id}** \`${action.status}\` • \`${safe(action.action_type)}\`\n` +
        `Executor: \`${safe(action.discord_name || "Desconhecido")}\`\n` +
        `Comando: \`${limitText(action.minecraft_command, 120).replace(/`/g, "'")}\`\n` +
        `Tentativas: \`${action.attempts}\` • Criado: ${discordTimestamp(action.created_at)}`
      );
    })
    .join("\n\n");

  const embed = new EmbedBuilder()
    .setTitle(`🧾 Últimas ações administrativas`)
    .setColor(0xff6600)
    .setDescription(description)
    .setFooter({ text: "Use /acao <id> para detalhes" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleAcao(interaction) {
  if (!(await requireBotAdmin(interaction))) return;

  await interaction.deferReply({ flags: 64 });

  const pool = getPool();
  const id = interaction.options.getInteger("id", true);

  const [rows] = await pool.execute(
    `
    SELECT
      id,
      discord_id,
      discord_name,
      action_type,
      minecraft_command,
      status,
      attempts,
      last_error,
      created_at,
      processed_at
    FROM culling_discord_admin_actions
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  if (rows.length === 0) {
    await interaction.editReply(`❌ Ação administrativa não encontrada: **#${id}**`);
    return;
  }

  const action = rows[0];

  const embed = new EmbedBuilder()
    .setTitle(`${statusEmoji(action.status)} Ação administrativa #${action.id}`)
    .setColor(action.status === "DONE" ? 0x33cc66 : action.status === "FAILED" ? 0xcc0000 : 0xffaa00)
    .setDescription(
      `**Status:** \`${safe(action.status)}\`\n` +
        `**Tipo:** \`${safe(action.action_type)}\`\n` +
        `**Executor:** <@${action.discord_id}> \`${safe(action.discord_name || "")}\`\n` +
        `**Tentativas:** \`${action.attempts}\`\n\n` +
        `**Comando Minecraft:**\n\`${safe(action.minecraft_command)}\`\n\n` +
        `**Erro:**\n${action.last_error ? `\`${limitText(action.last_error, 900).replace(/`/g, "'")}\`` : "`Nenhum`"}\n\n` +
        `**Criado:** ${discordTimestamp(action.created_at)}\n` +
        `**Processado:** ${discordTimestamp(action.processed_at)}`
    )
    .setFooter({ text: "Jogo do Abate • Auditoria" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = {
  handleBotStatus,
  handleAcoes,
  handleAcao,
};