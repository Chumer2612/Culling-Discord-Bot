const { EmbedBuilder } = require("discord.js");
const { getPool } = require("./database");
const { client, CHANNELS } = require("./config");

let lastAlertKey = "";
let lastAlertAt = 0;
let lastHadProblem = false;

const ALERT_COOLDOWN_MS = 15 * 60 * 1000;

function discordTimestamp(value) {
  if (!value) return "Nunca";

  const date = value instanceof Date ? value : new Date(value);
  const seconds = Math.floor(date.getTime() / 1000);

  if (!Number.isFinite(seconds)) return "Data inválida";

  return `<t:${seconds}:F>`;
}

async function runHealthMonitor() {
  try {
    const pool = getPool();

    const [[actions]] = await pool.execute(
      `
      SELECT
        COALESCE(SUM(CASE
          WHEN status IN ('PENDING', 'PROCESSING')
           AND created_at < (NOW() - INTERVAL 5 MINUTE)
          THEN 1 ELSE 0 END), 0) AS stuck_actions,

        COALESCE(SUM(CASE
          WHEN status = 'FAILED'
           AND processed_at > (NOW() - INTERVAL 15 MINUTE)
          THEN 1 ELSE 0 END), 0) AS recent_failed_actions,

        MAX(CASE
          WHEN status = 'FAILED'
          THEN processed_at ELSE NULL END) AS last_failed_at,

        MAX(CASE
          WHEN status IN ('PENDING', 'PROCESSING')
          THEN created_at ELSE NULL END) AS last_pending_at
      FROM culling_discord_admin_actions
      `
    );

    const [[outbox]] = await pool.execute(
      `
      SELECT
        COUNT(*) AS pending_outbox,
        COALESCE(SUM(CASE WHEN attempts >= 5 THEN 1 ELSE 0 END), 0) AS failed_outbox,
        MIN(created_at) AS oldest_outbox_at
      FROM culling_discord_outbox
      WHERE sent = 0
      `
    );

    const stuckActions = Number(actions.stuck_actions || 0);
    const failedActions = Number(actions.recent_failed_actions || 0);
    const pendingOutbox = Number(outbox.pending_outbox || 0);
    const failedOutbox = Number(outbox.failed_outbox || 0);

    const hasProblem =
      stuckActions > 0 ||
      failedActions > 0 ||
      failedOutbox > 0;

    const alertKey = `${stuckActions}:${failedActions}:${pendingOutbox}:${failedOutbox}`;

    if (!hasProblem) {
      if (lastHadProblem) {
        await sendRecoveryAlert();
      }

      lastHadProblem = false;
      lastAlertKey = "";
      return;
    }

    const now = Date.now();
    const canSend =
      alertKey !== lastAlertKey ||
      now - lastAlertAt > ALERT_COOLDOWN_MS;

    if (!canSend) {
      return;
    }

    await sendProblemAlert({
      stuckActions,
      failedActions,
      pendingOutbox,
      failedOutbox,
      lastFailedAt: actions.last_failed_at,
      lastPendingAt: actions.last_pending_at,
      oldestOutboxAt: outbox.oldest_outbox_at,
    });

    lastHadProblem = true;
    lastAlertKey = alertKey;
    lastAlertAt = now;
  } catch (error) {
    console.error("[CullingBot] Erro no monitor de saúde:", error);
  }
}

async function sendProblemAlert(data) {
  const channelId = CHANNELS.ADMIN_COMANDOS;

  if (!channelId || channelId.trim() === "") {
    console.warn("[CullingBot] CHANNEL_ADMIN_COMANDOS não configurado para alertas.");
    return;
  }

  const channel = await client.channels.fetch(channelId);

  if (!channel || !channel.isTextBased()) {
    console.warn("[CullingBot] Canal ADMIN_COMANDOS inválido para alertas.");
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("⚠️ Alerta de saúde do Kogane")
    .setColor(0xffaa00)
    .setDescription(
      `O bot detectou possível problema nas filas do Jogo do Abate.\n\n` +
        `**Ações admin travadas +5 min:** \`${data.stuckActions}\`\n` +
        `**Ações admin FAILED recentes:** \`${data.failedActions}\`\n` +
        `**Outbox pendente:** \`${data.pendingOutbox}\`\n` +
        `**Outbox com 5 tentativas:** \`${data.failedOutbox}\`\n\n` +
        `**Último FAILED:** ${discordTimestamp(data.lastFailedAt)}\n` +
        `**Último PENDING/PROCESSING:** ${discordTimestamp(data.lastPendingAt)}\n` +
        `**Outbox mais antiga:** ${discordTimestamp(data.oldestOutboxAt)}\n\n` +
        `Use \`/botstatus\`, \`/acoes status:Falhados\` ou \`/acoes status:Pendentes\` para investigar.`
    )
    .setFooter({ text: "Jogo do Abate • Monitoramento" })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

async function sendRecoveryAlert() {
  const channelId = CHANNELS.ADMIN_COMANDOS;

  if (!channelId || channelId.trim() === "") {
    return;
  }

  const channel = await client.channels.fetch(channelId);

  if (!channel || !channel.isTextBased()) {
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("✅ Kogane voltou ao normal")
    .setColor(0x33cc66)
    .setDescription(
      `As filas do bot/plugin voltaram ao estado normal.\n\n` +
        `Use \`/botstatus\` para confirmar os detalhes.`
    )
    .setFooter({ text: "Jogo do Abate • Monitoramento" })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

module.exports = {
  runHealthMonitor,
};