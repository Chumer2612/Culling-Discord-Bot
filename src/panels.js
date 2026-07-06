const { EmbedBuilder } = require("discord.js");
const { getPool } = require("./database");
const { client } = require("./config");

async function syncPanels() {
  console.log("[CullingBot] Sincronizando painéis dinâmicos...");
  await updatePanel("REGRAS");
  await updatePanel("CONDICAO_VITORIA");
}

async function updatePanel(panelType) {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT channel_id, message_id FROM culling_discord_panels WHERE panel_type = ? LIMIT 1`,
      [panelType]
    );

    if (rows.length === 0) return;

    const { channel_id, message_id } = rows[0];
    const channel = await client.channels.fetch(channel_id).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const message = await channel.messages.fetch(message_id).catch(() => null);
    if (!message) return;

    let embeds = [];
    if (panelType === "REGRAS") {
      embeds = await buildRulesEmbeds();
    } else if (panelType === "CONDICAO_VITORIA") {
      embeds = await buildVictoryEmbeds();
    }

    await message.edit({ embeds });
  } catch (error) {
    console.error(`[CullingBot] Erro ao atualizar painel ${panelType}:`, error);
  }
}

async function buildRulesEmbeds() {
  const pool = getPool();
  const [rows] = await pool.execute(
    `
    SELECT id, player_name, adapted_text, notes, resolved_at 
    FROM culling_victory_requests 
    WHERE request_type = 'RULE' 
      AND status IN ('APPROVED', 'ADAPTED') 
    ORDER BY resolved_at ASC
    `
  );

  const embeds = [];
  let currentEmbed = new EmbedBuilder()
    .setTitle("📜 Regras do Jogo do Abate")
    .setColor(0x00aaff)
    .setDescription("Aqui estão listadas todas as regras aprovadas oficialmente pela Staff.\n\n");

  if (rows.length === 0) {
    currentEmbed.setDescription("Ainda não há nenhuma regra aprovada.");
    return [currentEmbed];
  }

  let count = 1;
  let currentDesc = currentEmbed.data.description;

  for (const row of rows) {
    const text = row.adapted_text && row.adapted_text.trim() !== "" ? row.adapted_text : row.notes;
    const ruleText = `**${count}.** ${text}\n*Adicionada por: ${row.player_name}*\n\n`;

    if (currentDesc.length + ruleText.length > 4000) {
      currentEmbed.setDescription(currentDesc);
      embeds.push(currentEmbed);

      currentEmbed = new EmbedBuilder().setColor(0x00aaff);
      currentDesc = ruleText;
    } else {
      currentDesc += ruleText;
    }
    count++;
  }

  currentEmbed.setDescription(currentDesc);
  currentEmbed.setFooter({ text: "Jogo do Abate • Atualizado dinamicamente" });
  currentEmbed.setTimestamp();
  embeds.push(currentEmbed);

  return embeds;
}

async function buildVictoryEmbeds() {
  const pool = getPool();
  const [rows] = await pool.execute(
    `
    SELECT id, player_name, adapted_text, notes, resolved_at 
    FROM culling_victory_requests 
    WHERE request_type = 'VICTORY_CONDITION' 
      AND status IN ('APPROVED', 'ADAPTED') 
    ORDER BY resolved_at DESC 
    LIMIT 1
    `
  );

  const embed = new EmbedBuilder()
    .setTitle("🏆 Condição de Vitória")
    .setColor(0xffaa00)
    .setFooter({ text: "Jogo do Abate • Atualizado dinamicamente" })
    .setTimestamp();

  if (rows.length === 0) {
    embed.setDescription("Nenhuma condição de vitória foi aprovada ainda. A condição padrão está em vigor.");
  } else {
    const row = rows[0];
    const text = row.adapted_text && row.adapted_text.trim() !== "" ? row.adapted_text : row.notes;
    
    embed.setDescription(
      `A condição de vitória atual do servidor é:\n\n` +
      `**${text}**\n\n` +
      `*Aprovada através do pedido de ${row.player_name}*`
    );
  }

  return [embed];
}

module.exports = { syncPanels, updatePanel };
