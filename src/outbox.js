const { EmbedBuilder } = require("discord.js");
const { getPool } = require("./database");
const { client, CHANNELS } = require("./config");
const { buildRequestButtonsForOutbox } = require("./components/requestButtons");

let processingOutbox = false;

async function processDiscordOutbox() {
  if (processingOutbox) return;
  processingOutbox = true;

  try {
    const pool = getPool();

    const [rows] = await pool.execute(
      `
      SELECT id, channel_key, title, description, embed_color, created_at, attempts
      FROM culling_discord_outbox
      WHERE sent = 0
        AND attempts < 5
      ORDER BY id ASC
      LIMIT 10
      `
    );

    for (const row of rows) {
      await pool.execute(
        `
        UPDATE culling_discord_outbox
        SET attempts = attempts + 1
        WHERE id = ?
        `,
        [row.id]
      );

      try {
        await sendOutboxRow(row);

        await pool.execute(
          `
          DELETE FROM culling_discord_outbox
          WHERE id = ?
          `,
          [row.id]
        );
      } catch (error) {
        console.error("[CullingBot] Erro ao enviar outbox:", error);

        await pool.execute(
          `
          UPDATE culling_discord_outbox
          SET last_error = ?
          WHERE id = ?
          `,
          [String(error.message || error).slice(0, 1000), row.id]
        );
      }
    }
  } catch (error) {
    console.error("[CullingBot] Erro ao processar outbox:", error);
  } finally {
    processingOutbox = false;
  }
}

async function sendOutboxRow(row) {
  if (row.channel_key === "SYNC_PANELS") {
    const { syncPanels } = require("./panels");
    await syncPanels();
    return;
  }

  const channelId = CHANNELS[row.channel_key];

  if (!channelId || channelId.trim() === "") {
    throw new Error(`Canal não configurado no .env: ${row.channel_key}`);
  }

  const channel = await client.channels.fetch(channelId);

  if (!channel || !channel.isTextBased()) {
    throw new Error(`Canal inválido ou não textual: ${row.channel_key}`);
  }

  const embed = new EmbedBuilder()
    .setColor(Number(row.embed_color || 0xffaa00))
    .setDescription(row.description || "")
    .setTimestamp(new Date(row.created_at))
    .setFooter({ text: "Jogo do Abate" });

  if (row.title && row.title.trim() !== "") {
    embed.setTitle(row.title);
  }

  const components = await buildRequestButtonsForOutbox(row);

  await channel.send({
  embeds: [embed],
  components,
  allowedMentions: {
    parse: ["users"],
  },
});
}

async function cleanupDiscordOutbox() {
  try {
    const pool = getPool();

    const [result] = await pool.execute(
      `
      DELETE FROM culling_discord_outbox
      WHERE attempts >= 5
        AND created_at < (NOW() - INTERVAL 30 MINUTE)
      `
    );

    if (result.affectedRows > 0) {
      console.log(
        `[CullingBot] Mensagens antigas com erro removidas da outbox: ${result.affectedRows}`
      );
    }
  } catch (error) {
    console.error("[CullingBot] Erro ao limpar outbox:", error);
  }
}

module.exports = {
  processDiscordOutbox,
  cleanupDiscordOutbox,
};