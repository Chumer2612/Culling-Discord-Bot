const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require("discord.js");

const { getPool } = require("../database");
const { requireBotAdmin } = require("../security");

const REQUEST_CHANNEL_KEYS = new Set([
  "PEDIDOS",
  "REGRAS_PENDENTES",
  "CONDICOES_VITORIA",
]);

function extractRequestIdFromRow(row) {
  const source = `${row.title || ""}\n${row.description || ""}`;
  const match = source.match(/#\s*(\d+)/);

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function detectRequestStatus(row) {
  const source = `${row.title || ""}\n${row.description || ""}`.toUpperCase();

  if (source.includes("PENDING") || source.includes("NOVO PEDIDO")) {
    return "PENDING";
  }

  if (source.includes("ADAPTED") || source.includes("ADAPTA")) {
    return "ADAPTED";
  }

  if (source.includes("APPROVED") || source.includes("APROVADO")) {
    return "APPROVED";
  }

  if (source.includes("DENIED") || source.includes("NEGADO")) {
    return "DENIED";
  }

  if (source.includes("COMPLETED") || source.includes("CONCLU")) {
    return "COMPLETED";
  }

  return "UNKNOWN";
}

async function buildRequestButtonsForOutbox(row) {
  if (!REQUEST_CHANNEL_KEYS.has(row.channel_key)) {
    return [];
  }

  const requestId = extractRequestIdFromRow(row);

  if (!requestId) {
    return [];
  }

  const status = await getRequestStatus(requestId) || detectRequestStatus(row);

  return buildButtonsByStatus(requestId, status);
}

async function getRequestStatus(requestId) {
  try {
    const pool = getPool();

    const [rows] = await pool.execute(
      `
      SELECT status
      FROM culling_victory_requests
      WHERE id = ?
      LIMIT 1
      `,
      [requestId]
    );

    if (rows.length === 0) {
      return null;
    }

    return String(rows[0].status || "UNKNOWN").toUpperCase();
  } catch (error) {
    console.error("[CullingBot] Erro ao consultar status do pedido:", error);
    return null;
  }
}

function buildButtonsByStatus(requestId, status) {
  const normalized = String(status || "UNKNOWN").toUpperCase();

  const viewButton = new ButtonBuilder()
    .setCustomId(`request:view:${requestId}`)
    .setLabel("Ver")
    .setEmoji("🔎")
    .setStyle(ButtonStyle.Secondary);

  const approveButton = new ButtonBuilder()
    .setCustomId(`request:approve:${requestId}`)
    .setLabel("Aprovar")
    .setEmoji("✅")
    .setStyle(ButtonStyle.Success);

  const denyButton = new ButtonBuilder()
    .setCustomId(`request:deny:${requestId}`)
    .setLabel("Negar")
    .setEmoji("❌")
    .setStyle(ButtonStyle.Danger);

  const adaptButton = new ButtonBuilder()
    .setCustomId(`request:adapt:${requestId}`)
    .setLabel("Adaptar")
    .setEmoji("📝")
    .setStyle(ButtonStyle.Primary);

  const completeButton = new ButtonBuilder()
    .setCustomId(`request:complete:${requestId}`)
    .setLabel("Concluir")
    .setEmoji("🏁")
    .setStyle(ButtonStyle.Success);

  if (normalized === "PENDING" || normalized === "UNKNOWN") {
    return [
      new ActionRowBuilder().addComponents(
        viewButton,
        approveButton,
        denyButton,
        adaptButton
      ),
    ];
  }

  if (normalized === "APPROVED" || normalized === "ADAPTED") {
    return [
      new ActionRowBuilder().addComponents(
        viewButton,
        completeButton
      ),
    ];
  }

  return [
    new ActionRowBuilder().addComponents(viewButton),
  ];
}

function isActionAllowedForStatus(action, status) {
  const normalized = String(status || "UNKNOWN").toUpperCase();

  if (action === "view") {
    return true;
  }

  if (normalized === "PENDING" || normalized === "UNKNOWN") {
    return ["approve", "deny", "adapt"].includes(action);
  }

  if (normalized === "APPROVED" || normalized === "ADAPTED") {
    return action === "complete";
  }

  return false;
}

async function handleRequestComponent(interaction) {
  if (interaction.isButton()) {
    return handleRequestButton(interaction);
  }

  if (interaction.isModalSubmit()) {
    return handleRequestModal(interaction);
  }

  return false;
}

async function handleRequestButton(interaction) {
  if (!interaction.customId.startsWith("request:")) {
    return false;
  }

  if (!(await requireBotAdmin(interaction))) {
    return true;
  }

  const parts = interaction.customId.split(":");
  const action = parts[1];
  const requestId = Number(parts[2]);
  const currentStatus = await getRequestStatus(requestId);

    if (!isActionAllowedForStatus(action, currentStatus)) {
    await interaction.reply({
        content:
        `❌ Esse pedido já está com status **${currentStatus || "desconhecido"}**.\n` +
        `Use o botão **Ver** para consultar o estado atual.`,
        flags: 64,
     });
  return true;
}
  

  if (!requestId) {
    await interaction.reply({
      content: "❌ ID do pedido inválido.",
      flags: 64,
    });
    return true;
  }

  if (action === "view") {
    await showRequestDetails(interaction, requestId);
    return true;
  }

  if (!["approve", "deny", "adapt", "complete"].includes(action)) {
    await interaction.reply({
      content: "❌ Ação de pedido inválida.",
      flags: 64,
    });
    return true;
  }

  const modal = new ModalBuilder()
    .setCustomId(`requestmodal:${action}:${requestId}`)
    .setTitle(getModalTitle(action, requestId));

  const input = new TextInputBuilder()
    .setCustomId("text")
    .setLabel(getModalLabel(action))
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(2)
    .setMaxLength(500)
    .setRequired(true)
    .setPlaceholder(getModalPlaceholder(action));

  modal.addComponents(new ActionRowBuilder().addComponents(input));

  await interaction.showModal(modal);
  return true;
}

async function handleRequestModal(interaction) {
  if (!interaction.customId.startsWith("requestmodal:")) {
    return false;
  }

  if (!(await requireBotAdmin(interaction))) {
    return true;
  }

  await interaction.deferReply({ flags: 64 });

  const parts = interaction.customId.split(":");
  const action = parts[1];
  const requestId = Number(parts[2]);
  const text = cleanText(interaction.fields.getTextInputValue("text"), 500);
  const currentStatus = await getRequestStatus(requestId);

    if (!isActionAllowedForStatus(action, currentStatus)) {
    await interaction.editReply(
        `❌ Esse pedido já está com status **${currentStatus || "desconhecido"}** e essa ação não é mais permitida.`
    );
    return true;
    }

  if (!requestId || !text || text.length < 2) {
    await interaction.editReply("❌ Dados inválidos para processar o pedido.");
    return true;
  }

  const minecraftAction = mapActionToMinecraft(action);

  if (!minecraftAction) {
    await interaction.editReply("❌ Ação inválida.");
    return true;
  }

  const minecraftCommand = `/cullingadmin pedidos ${minecraftAction} ${requestId} ${text}`;

  const actionId = await enqueueAdminAction(
    interaction,
    "PEDIDO_BOTAO",
    minecraftCommand
  );

  const embed = new EmbedBuilder()
    .setTitle("⏳ Pedido enviado ao plugin")
    .setColor(0xffaa00)
    .setDescription(
      `**ID da ação:** \`#${actionId}\`\n` +
        `**Pedido:** \`#${requestId}\`\n` +
        `**Executor:** <@${interaction.user.id}>\n` +
        `**Ação:** \`${minecraftAction}\`\n` +
        `**Comando Minecraft:** \`${minecraftCommand.replace(/`/g, "'")}\`\n\n` +
        `O plugin vai executar pelo console e registrar no canal de admin.`
    )
    .setFooter({ text: "Jogo do Abate • Botões de Pedido" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
  return true;
}

async function showRequestDetails(interaction, requestId) {
  await interaction.deferReply({ flags: 64 });

  const pool = getPool();

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
    [requestId]
  );

  if (rows.length === 0) {
    await interaction.editReply(`❌ Pedido não encontrado: **#${requestId}**`);
    return;
  }

  const request = rows[0];

  const discordText = request.discord_id
    ? `<@${request.discord_id}> \`${safe(request.discord_name || "")}\``
    : "`Não vinculado`";

  const embed = new EmbedBuilder()
    .setTitle(`🔎 Pedido #${request.id}`)
    .setColor(0x3399ff)
    .setDescription(
      `**Jogador:** \`${safe(request.player_name)}\`\n` +
        `**Discord:** ${discordText}\n` +
        `**Tipo:** \`${requestTypeName(request.request_type)}\`\n` +
        `**Status:** \`${request.status}\`\n` +
        `**Custo:** \`${request.cost} Pontos de Abate\`\n` +
        `**Criado:** ${discordTimestamp(request.created_at)}\n` +
        `**Resolvido:** ${discordTimestamp(request.resolved_at)}\n` +
        `**Resolvido por:** \`${safe(request.resolved_by || "Ninguém")}\`\n\n` +
        `**Pedido original:**\n${limitText(request.notes, 900)}\n\n` +
        `**Texto adaptado:**\n${limitText(request.adapted_text, 900)}\n\n` +
        `**Notas da staff:**\n${limitText(request.staff_notes, 900)}`
    )
    .setFooter({ text: "Jogo do Abate • Pedido" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
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

function mapActionToMinecraft(action) {
  if (action === "approve") return "aprovar";
  if (action === "deny") return "negar";
  if (action === "adapt") return "adaptar";
  if (action === "complete") return "concluir";
  return null;
}

function getModalTitle(action, requestId) {
  if (action === "approve") return `Aprovar pedido #${requestId}`;
  if (action === "deny") return `Negar pedido #${requestId}`;
  if (action === "adapt") return `Adaptar pedido #${requestId}`;
  if (action === "complete") return `Concluir pedido #${requestId}`;
  return `Pedido #${requestId}`;
}

function getModalLabel(action) {
  if (action === "approve") return "Motivo da aprovação";
  if (action === "deny") return "Motivo da negação";
  if (action === "adapt") return "Texto adaptado oficial";
  if (action === "complete") return "Observação de conclusão";
  return "Texto";
}

function getModalPlaceholder(action) {
  if (action === "approve") return "Ex: Regra válida e aceita pela staff.";
  if (action === "deny") return "Ex: Contradiz uma regra anterior.";
  if (action === "adapt") return "Digite aqui a versão oficial adaptada.";
  if (action === "complete") return "Ex: Regra aplicada oficialmente no rules.yml.";
  return "Digite aqui...";
}

function cleanText(text, maxLength = 500) {
  if (!text) return "";

  return String(text)
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/`/g, "'")
    .trim()
    .slice(0, maxLength);
}

function safe(value) {
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

function discordTimestamp(value) {
  if (!value) {
    return "Nunca";
  }

  const date = value instanceof Date ? value : new Date(value);
  const seconds = Math.floor(date.getTime() / 1000);

  if (!Number.isFinite(seconds)) {
    return "Data inválida";
  }

  return `<t:${seconds}:F>`;
}

function requestTypeName(type) {
  if (!type) return "Desconhecido";
  if (String(type).toUpperCase() === "RULE") return "Regra";
  if (String(type).toUpperCase() === "VICTORY_CONDITION") return "Condição de Vitória";
  return String(type);
}

module.exports = {
  buildRequestButtonsForOutbox,
  handleRequestComponent,
};