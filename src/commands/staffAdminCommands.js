const { EmbedBuilder } = require("discord.js");
const { getPool } = require("../database");
const { requireBotAdmin } = require("../security");

function cleanText(text, maxLength = 500) {
  if (!text) return "";

  return String(text)
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/`/g, "'")
    .trim()
    .slice(0, maxLength);
}

function discordTimestamp(value) {
  if (!value) {
    return "`Nunca`";
  }

  const date = value instanceof Date ? value : new Date(value);
  const seconds = Math.floor(date.getTime() / 1000);

  if (!Number.isFinite(seconds)) {
    return "`Data inválida`";
  }

  return `<t:${seconds}:F>`;
}

async function enqueueAdminAction(interaction, actionType, minecraftCommand) {
  const pool = getPool();

  const discordId = interaction.user.id;
  const discordName = interaction.user.tag || interaction.user.username;

  const [result] = await pool.execute(
    `
    INSERT INTO culling_discord_admin_actions
    (discord_id, discord_name, action_type, minecraft_command)
    VALUES (?, ?, ?, ?)
    `,
    [discordId, discordName, actionType, minecraftCommand]
  );

  return result.insertId;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAdminAction(actionId) {
  const pool = getPool();

  const [rows] = await pool.execute(
    `
    SELECT id, action_type, minecraft_command, status, attempts, last_error, created_at, processed_at
    FROM culling_discord_admin_actions
    WHERE id = ?
    LIMIT 1
    `,
    [actionId]
  );

  return rows.length > 0 ? rows[0] : null;
}

async function waitForAdminAction(actionId, maxWaitMs = 20000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    const action = await getAdminAction(actionId);

    if (!action) {
      return {
        status: "FAILED",
        last_error: "Ação não encontrada no banco.",
      };
    }

    if (action.status === "DONE" || action.status === "FAILED") {
      return action;
    }

    await sleep(1500);
  }

  return {
    status: "PENDING",
    last_error: "O plugin ainda não concluiu a ação. Confira o canal de admin ou o banco.",
  };
}

async function getPlayerSnapshotFromCommand(minecraftCommand) {
  const match = minecraftCommand.match(/cullingadmin\s+(pontos|vidas)\s+\w+\s+([^\s]+)/i);

  if (!match) {
    return null;
  }

  const nick = match[2];

  const pool = getPool();

  const [rows] = await pool.execute(
    `
    SELECT name, fame, lives, eliminated, allowed, updated_at
    FROM culling_players
    WHERE LOWER(name) = LOWER(?)
    LIMIT 1
    `,
    [nick]
  );

  return rows.length > 0 ? rows[0] : null;
}

async function replyQueued(interaction, actionId, minecraftCommand) {
  const pendingEmbed = new EmbedBuilder()
    .setTitle("⏳ Pedido enviado ao plugin")
    .setColor(0xffaa00)
    .setDescription(
      `**ID da ação:** \`#${actionId}\`\n` +
        `**Executor:** <@${interaction.user.id}>\n` +
        `**Comando Minecraft:** \`${minecraftCommand.replace(/`/g, "'")}\`\n\n` +
        `Aguardando o plugin executar pelo console...`
    )
    .setFooter({ text: "Jogo do Abate • Admin Bot" })
    .setTimestamp();

  await interaction.editReply({ embeds: [pendingEmbed] });

  const result = await waitForAdminAction(actionId);
  const playerSnapshot = result.status === "DONE"
    ? await getPlayerSnapshotFromCommand(minecraftCommand)
    : null;

  let title;
  let color;
  let extra = "";

  if (result.status === "DONE") {
    title = "✅ Ação executada pelo plugin";
    color = 0x33cc66;
  } else if (result.status === "FAILED") {
    title = "❌ Ação falhou no plugin";
    color = 0xcc0000;
    extra =
      `\n\n**Erro:**\n\`${String(result.last_error || "Erro desconhecido.").replace(/`/g, "'")}\``;
  } else {
    title = "⏳ Ação ainda pendente";
    color = 0xffaa00;
    extra =
      `\n\n**Aviso:**\n\`${String(result.last_error || "Ainda pendente.").replace(/`/g, "'")}\``;
  }

  if (playerSnapshot) {
    extra +=
      `\n\n**Estado atual do jogador:**\n` +
      `**Nick:** \`${playerSnapshot.name}\`\n` +
      `**Pontos de Abate:** \`${playerSnapshot.fame}\`\n` +
      `**Vidas:** \`${playerSnapshot.lives}\`\n` +
      `**Eliminado:** \`${Number(playerSnapshot.eliminated) === 1 ? "Sim" : "Não"}\`\n` +
      `**Permitido:** \`${Number(playerSnapshot.allowed) === 1 ? "Sim" : "Não"}\``;
  }

  const finalEmbed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setDescription(
      `**ID da ação:** \`#${actionId}\`\n` +
        `**Executor:** <@${interaction.user.id}>\n` +
        `**Comando Minecraft:** \`${minecraftCommand.replace(/`/g, "'")}\`\n` +
        `**Status:** \`${result.status}\`\n` +
        `**Tentativas:** \`${result.attempts ?? "-"}\`` +
        extra
    )
    .setFooter({ text: "Jogo do Abate • Admin Bot" })
    .setTimestamp();

  await interaction.editReply({ embeds: [finalEmbed] });
}


async function handleAdminPontos(interaction) {
  if (!(await requireBotAdmin(interaction))) return;

  await interaction.deferReply({ flags: 64 });

  const nick = cleanText(interaction.options.getString("nick", true), 32);
  const action = interaction.options.getString("acao", true);
  const value = interaction.options.getInteger("valor", false);

  if (action === "ver") {
    const pool = getPool();

    const [rows] = await pool.execute(
      `
      SELECT name, fame, lives, eliminated, allowed, updated_at
      FROM culling_players
      WHERE LOWER(name) = LOWER(?)
      LIMIT 1
      `,
      [nick]
    );

    if (rows.length === 0) {
      await interaction.editReply(`❌ Jogador não encontrado: **${nick}**`);
      return;
    }

    const player = rows[0];

    const embed = new EmbedBuilder()
      .setTitle("📊 Consulta de Pontos de Abate")
      .setColor(0xffaa00)
      .setDescription(
        `**Jogador:** \`${player.name}\`\n` +
          `**Pontos de Abate:** \`${player.fame}\`\n` +
          `**Vidas:** \`${player.lives}\`\n` +
          `**Eliminado:** \`${Number(player.eliminated) === 1 ? "Sim" : "Não"}\`\n` +
          `**Permitido:** \`${Number(player.allowed) === 1 ? "Sim" : "Não"}\`\n` +
          `**Atualizado:** ${discordTimestamp(player.updated_at)}`
      )
      .setFooter({ text: "Jogo do Abate • Consulta direta" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (["set", "add", "remove"].includes(action) && value === null) {
    await interaction.editReply("❌ Essa ação precisa do campo `valor`.");
    return;
  }

  const command = `/cullingadmin pontos ${action} ${nick} ${value}`;

  const actionId = await enqueueAdminAction(interaction, "PONTOS", command);
  await replyQueued(interaction, actionId, command);
}

async function handleAdminVidas(interaction) {
  if (!(await requireBotAdmin(interaction))) return;

  await interaction.deferReply({ flags: 64 });

  const nick = cleanText(interaction.options.getString("nick", true), 32);
  const action = interaction.options.getString("acao", true);
  const value = interaction.options.getInteger("valor", false);

  if (action === "ver") {
    const pool = getPool();

    const [rows] = await pool.execute(
      `
      SELECT name, fame, lives, eliminated, allowed, updated_at, last_inactivity_penalty_at
      FROM culling_players
      WHERE LOWER(name) = LOWER(?)
      LIMIT 1
      `,
      [nick]
    );

    if (rows.length === 0) {
      await interaction.editReply(`❌ Jogador não encontrado: **${nick}**`);
      return;
    }

    const player = rows[0];

    const embed = new EmbedBuilder()
      .setTitle("❤️ Consulta de Vidas")
      .setColor(Number(player.eliminated) === 1 ? 0xcc0000 : 0x33cc66)
      .setDescription(
        `**Jogador:** \`${player.name}\`\n` +
          `**Vidas:** \`${player.lives}\`\n` +
          `**Pontos de Abate:** \`${player.fame}\`\n` +
          `**Eliminado:** \`${Number(player.eliminated) === 1 ? "Sim" : "Não"}\`\n` +
          `**Permitido:** \`${Number(player.allowed) === 1 ? "Sim" : "Não"}\`\n` +
          `**Última penalidade:** ${discordTimestamp(player.last_inactivity_penalty_at)}\n` +
          `**Atualizado:** ${discordTimestamp(player.updated_at)}`
      )
      .setFooter({ text: "Jogo do Abate • Consulta direta" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (["set", "add", "remove"].includes(action) && value === null) {
    await interaction.editReply("❌ Essa ação precisa do campo `valor`.");
    return;
  }

  let command;

  if (["set", "add", "remove"].includes(action)) {
    command = `/cullingadmin vidas ${action} ${nick} ${value}`;
  } else {
    command = `/cullingadmin vidas ${action} ${nick}`;
  }

  const actionId = await enqueueAdminAction(interaction, "VIDAS", command);
  await replyQueued(interaction, actionId, command);
}

async function handleAdminBoss(interaction) {
  if (!(await requireBotAdmin(interaction))) return;

  await interaction.deferReply({ flags: 64 });

  const action = interaction.options.getString("acao", true);

  const command = `/cullingadmin boss ${action}`;

  const actionId = await enqueueAdminAction(interaction, "BOSS", command);
  await replyQueued(interaction, actionId, command);
}

async function handleAdminPedido(interaction) {
  if (!(await requireBotAdmin(interaction))) return;

  await interaction.deferReply({ flags: 64 });

  const action = interaction.options.getString("acao", true);
  const id = interaction.options.getInteger("id", true);
  const text = cleanText(interaction.options.getString("texto", true), 500);

  if (!text || text.length < 2) {
    await interaction.editReply("❌ O campo `texto` precisa ter pelo menos 2 caracteres.");
    return;
  }

  const command = `/cullingadmin pedidos ${action} ${id} ${text}`;

  const actionId = await enqueueAdminAction(interaction, "PEDIDO", command);
  await replyQueued(interaction, actionId, command);
}

async function handleSetupPanel(interaction) {
  const { requireBotAdmin } = require("../security");
  if (!(await requireBotAdmin(interaction, true))) return;

  const tipo = interaction.options.getString("tipo", true);
  await interaction.deferReply({ flags: 64 });

  const { EmbedBuilder } = require("discord.js");
  const embed = new EmbedBuilder()
    .setTitle("⏳ Carregando Painel...")
    .setDescription("Este painel será atualizado em breve.")
    .setColor(0x333333);

  const message = await interaction.channel.send({ embeds: [embed] });

  const { getPool } = require("../database");
  const pool = getPool();
  await pool.execute(
    `
    INSERT INTO culling_discord_panels (panel_type, channel_id, message_id)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      channel_id = VALUES(channel_id),
      message_id = VALUES(message_id)
    `,
    [tipo, interaction.channel.id, message.id]
  );

  const { syncPanels } = require("../panels");
  await syncPanels();

  await interaction.editReply(`✅ Painel **${tipo}** configurado com sucesso neste canal!`);
}

module.exports = {
  handleAdminPontos,
  handleAdminVidas,
  handleAdminBoss,
  handleAdminPedido,
  handleSetupPanel
};