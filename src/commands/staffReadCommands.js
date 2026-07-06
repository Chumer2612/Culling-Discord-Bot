const { EmbedBuilder } = require("discord.js");
const { getPool } = require("../database");
const { requireBotAdmin } = require("../security");

function escapeInlineCode(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/`/g, "'");
}

function limitText(value, maxLength) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "Sem informação.";
  }

  const text = String(value);
  return text.length <= maxLength ? text : text.slice(0, maxLength - 3) + "...";
}

function boolText(value) {
  return Number(value) === 1 ? "Sim" : "Não";
}

function discordTimestamp(value) {
  if (!value) return "Nunca";

  const date = value instanceof Date ? value : new Date(value);
  const seconds = Math.floor(date.getTime() / 1000);

  if (!Number.isFinite(seconds)) return "Data inválida";

  return `<t:${seconds}:F>`;
}

function requestTypeName(type) {
  if (!type) return "Desconhecido";

  if (String(type).toUpperCase() === "RULE") return "Regra";
  if (String(type).toUpperCase() === "VICTORY_CONDITION") return "Condição de Vitória";

  return String(type);
}

function statusIcon(status) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "PENDING") return "⏳";
  if (normalized === "APPROVED") return "✅";
  if (normalized === "DENIED") return "❌";
  if (normalized === "ADAPTED") return "📝";
  if (normalized === "COMPLETED") return "🏁";

  return "📌";
}

async function handleEvento(interaction) {
  if (!(await requireBotAdmin(interaction))) return;

  await interaction.deferReply({ flags: 64 });

  const pool = getPool();

  const [[players]] = await pool.execute(
    `
    SELECT
      COUNT(*) AS total_players,
      COALESCE(SUM(CASE WHEN eliminated = 0 AND allowed = 1 THEN 1 ELSE 0 END), 0) AS alive_players,
      COALESCE(SUM(CASE WHEN eliminated = 1 THEN 1 ELSE 0 END), 0) AS eliminated_players,
      COALESCE(SUM(CASE WHEN allowed = 0 THEN 1 ELSE 0 END), 0) AS blocked_players,
      COALESCE(SUM(fame), 0) AS total_points
    FROM culling_players
    `
  );

  const [[links]] = await pool.execute(
    `
    SELECT COUNT(*) AS linked_players
    FROM culling_discord_links
    `
  );

  const [[kills]] = await pool.execute(
    `
    SELECT COUNT(*) AS total_kills
    FROM culling_kills
    `
  );

  const [[requests]] = await pool.execute(
    `
    SELECT
      COUNT(*) AS total_requests,
      COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending_requests
    FROM culling_victory_requests
    `
  );

  const embed = new EmbedBuilder()
    .setTitle("📊 Status do Jogo do Abate")
    .setColor(0xffaa00)
    .setDescription(
      `**Jogadores registrados:** \`${players.total_players}\`\n` +
        `**Vivos/permitidos:** \`${players.alive_players}\`\n` +
        `**Eliminados:** \`${players.eliminated_players}\`\n` +
        `**Bloqueados:** \`${players.blocked_players}\`\n` +
        `**Vinculados ao Discord:** \`${links.linked_players}\`\n\n` +
        `**Pontos de Abate totais:** \`${players.total_points}\`\n` +
        `**Kills registradas:** \`${kills.total_kills}\`\n` +
        `**Pedidos totais:** \`${requests.total_requests}\`\n` +
        `**Pedidos pendentes:** \`${requests.pending_requests}\``
    )
    .setFooter({ text: "Jogo do Abate • Staff" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handlePlayer(interaction) {
  if (!(await requireBotAdmin(interaction))) return;

  await interaction.deferReply({ flags: 64 });

  const pool = getPool();
  const nick = interaction.options.getString("nick", true).trim();

  const [rows] = await pool.execute(
    `
    SELECT
      p.uuid,
      p.name,
      p.fame,
      p.lives,
      p.eliminated,
      p.allowed,
      p.created_at,
      p.updated_at,
      p.last_fame_change_at,
      p.last_inactivity_penalty_at,
      d.discord_id,
      d.discord_name,
      d.linked_at
    FROM culling_players p
    LEFT JOIN culling_discord_links d
      ON d.minecraft_uuid = p.uuid
    WHERE LOWER(p.name) = LOWER(?)
    LIMIT 1
    `,
    [nick]
  );

  if (rows.length === 0) {
    await interaction.editReply(`❌ Jogador não encontrado: **${nick}**`);
    return;
  }

  const player = rows[0];

  const [[killStats]] = await pool.execute(
    `
    SELECT
      COALESCE(SUM(CASE WHEN killer_uuid = ? THEN 1 ELSE 0 END), 0) AS kills,
      COALESCE(SUM(CASE WHEN victim_uuid = ? THEN 1 ELSE 0 END), 0) AS deaths
    FROM culling_kills
    WHERE killer_uuid = ?
       OR victim_uuid = ?
    `,
    [player.uuid, player.uuid, player.uuid, player.uuid]
  );

  const discordText = player.discord_id
    ? `<@${player.discord_id}> \`${escapeInlineCode(player.discord_name || "")}\``
    : "`Não vinculado`";

  const embed = new EmbedBuilder()
    .setTitle(`👤 Player: ${player.name}`)
    .setColor(Number(player.eliminated) === 1 ? 0xcc0000 : 0x33cc66)
    .setDescription(
      `**UUID:** \`${player.uuid}\`\n` +
        `**Discord:** ${discordText}\n\n` +
        `**Pontos de Abate:** \`${player.fame}\`\n` +
        `**Vidas:** \`${player.lives}\`\n` +
        `**Eliminado:** \`${boolText(player.eliminated)}\`\n` +
        `**Permitido:** \`${boolText(player.allowed)}\`\n\n` +
        `**Kills:** \`${killStats.kills}\`\n` +
        `**Mortes por player:** \`${killStats.deaths}\`\n\n` +
        `**Criado:** ${discordTimestamp(player.created_at)}\n` +
        `**Atualizado:** ${discordTimestamp(player.updated_at)}\n` +
        `**Última mudança de pontos:** ${discordTimestamp(player.last_fame_change_at)}\n` +
        `**Última penalidade inatividade:** ${discordTimestamp(player.last_inactivity_penalty_at)}\n` +
        `**Vínculo Discord:** ${discordTimestamp(player.linked_at)}`
    )
    .setFooter({ text: "Jogo do Abate • Staff" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handlePedidos(interaction) {
  if (!(await requireBotAdmin(interaction))) return;

  await interaction.deferReply({ flags: 64 });

  const pool = getPool();
  const status = interaction.options.getString("status", false) || "PENDING";

  let rows;

  if (status === "ALL") {
    const [result] = await pool.execute(
      `
      SELECT id, player_name, request_type, status, cost, created_at
      FROM culling_victory_requests
      ORDER BY id DESC
      LIMIT 10
      `
    );
    rows = result;
  } else {
    const [result] = await pool.execute(
      `
      SELECT id, player_name, request_type, status, cost, created_at
      FROM culling_victory_requests
      WHERE status = ?
      ORDER BY id DESC
      LIMIT 10
      `,
      [status]
    );
    rows = result;
  }

  if (rows.length === 0) {
    await interaction.editReply(
      `📭 Nenhum pedido encontrado para o filtro: **${status}**`
    );
    return;
  }

  const description = rows
    .map((request) => {
      return (
        `${statusIcon(request.status)} **#${request.id}** ` +
        `\`${request.status}\` • \`${requestTypeName(request.request_type)}\`\n` +
        `Jogador: \`${escapeInlineCode(request.player_name)}\` • ` +
        `Custo: \`${request.cost}\`\n` +
        `Criado: ${discordTimestamp(request.created_at)}`
      );
    })
    .join("\n\n");

  const embed = new EmbedBuilder()
    .setTitle("📥 Pedidos do Jogo do Abate")
    .setColor(0x3399ff)
    .setDescription(description)
    .setFooter({ text: "Use /pedido <id> para ver detalhes" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handlePedido(interaction) {
  if (!(await requireBotAdmin(interaction))) return;

  await interaction.deferReply({ flags: 64 });

  const pool = getPool();
  const id = interaction.options.getInteger("id", true);

  const [rows] = await pool.execute(
    `
    SELECT
      r.id,
      r.player_uuid,
      r.player_name,
      r.request_type,
      r.status,
      r.cost,
      r.notes,
      r.resolved_by,
      r.created_at,
      r.resolved_at,
      r.staff_notes,
      r.adapted_text,
      d.discord_id,
      d.discord_name
    FROM culling_victory_requests r
    LEFT JOIN culling_discord_links d
      ON d.minecraft_uuid = r.player_uuid
    WHERE r.id = ?
    LIMIT 1
    `,
    [id]
  );

  if (rows.length === 0) {
    await interaction.editReply(`❌ Pedido não encontrado: **#${id}**`);
    return;
  }

  const request = rows[0];

  const discordText = request.discord_id
    ? `<@${request.discord_id}> \`${escapeInlineCode(request.discord_name || "")}\``
    : "`Não vinculado`";

  const embed = new EmbedBuilder()
    .setTitle(`${statusIcon(request.status)} Pedido #${request.id}`)
    .setColor(0x3399ff)
    .setDescription(
      `**Jogador:** \`${escapeInlineCode(request.player_name)}\`\n` +
        `**Discord:** ${discordText}\n` +
        `**Tipo:** \`${requestTypeName(request.request_type)}\`\n` +
        `**Status:** \`${request.status}\`\n` +
        `**Custo:** \`${request.cost} Pontos de Abate\`\n` +
        `**Criado:** ${discordTimestamp(request.created_at)}\n` +
        `**Resolvido:** ${discordTimestamp(request.resolved_at)}\n` +
        `**Resolvido por:** \`${escapeInlineCode(request.resolved_by || "Ninguém")}\`\n\n` +
        `**Pedido original:**\n${limitText(request.notes, 900)}\n\n` +
        `**Texto adaptado:**\n${limitText(request.adapted_text, 900)}\n\n` +
        `**Notas da staff:**\n${limitText(request.staff_notes, 900)}\n\n` +
        `**Comandos Minecraft:**\n` +
        `\`/cullingadmin pedidos ver ${request.id}\`\n` +
        `\`/cullingadmin pedidos aprovar ${request.id} <motivo>\`\n` +
        `\`/cullingadmin pedidos negar ${request.id} <motivo>\`\n` +
        `\`/cullingadmin pedidos adaptar ${request.id} <texto>\``
    )
    .setFooter({ text: "Jogo do Abate • Staff" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleKills(interaction) {
  if (!(await requireBotAdmin(interaction))) return;

  await interaction.deferReply({ flags: 64 });

  const pool = getPool();
  const nick = interaction.options.getString("nick", false);

  let rows;

  if (nick && nick.trim() !== "") {
    const [result] = await pool.execute(
      `
      SELECT id, killer_name, victim_name, fame_awarded, victim_lives_after, created_at
      FROM culling_kills
      WHERE LOWER(killer_name) = LOWER(?)
         OR LOWER(victim_name) = LOWER(?)
      ORDER BY id DESC
      LIMIT 10
      `,
      [nick.trim(), nick.trim()]
    );
    rows = result;
  } else {
    const [result] = await pool.execute(
      `
      SELECT id, killer_name, victim_name, fame_awarded, victim_lives_after, created_at
      FROM culling_kills
      ORDER BY id DESC
      LIMIT 10
      `
    );
    rows = result;
  }

  if (rows.length === 0) {
    await interaction.editReply("📭 Nenhuma kill encontrada.");
    return;
  }

  const description = rows
    .map((kill) => {
      return (
        `**#${kill.id}** ` +
        `\`${escapeInlineCode(kill.killer_name)}\` matou ` +
        `\`${escapeInlineCode(kill.victim_name)}\`\n` +
        `Pontos: \`${kill.fame_awarded}\` • ` +
        `Vidas da vítima após morte: \`${kill.victim_lives_after}\`\n` +
        `Data: ${discordTimestamp(kill.created_at)}`
      );
    })
    .join("\n\n");

  const title =
    nick && nick.trim() !== ""
      ? `⚔️ Kills envolvendo ${nick.trim()}`
      : "⚔️ Kills recentes";

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0xcc0000)
    .setDescription(description)
    .setFooter({ text: "Jogo do Abate • Staff" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = {
  handleEvento,
  handlePlayer,
  handlePedidos,
  handlePedido,
  handleKills,
};