const { getPool } = require("../database");
const { handleEvento, handlePlayer, handlePedidos, handlePedido, handleKills } = require("./staffReadCommands");
const { handleAdminPontos, handleAdminVidas, handleAdminBoss, handleAdminPedido, handleSetupPanel } = require("./staffAdminCommands");
const { handleRequestComponent } = require("../components/requestButtons");
const { ensureJogadoresRole, formatRoleResult } = require("../roles");
const { handleBotStatus, handleAcoes, handleAcao } = require("./auditCommands");

async function handleInteraction(interaction) {
  if (interaction.guildId !== process.env.DISCORD_GUILD_ID) {
    if (interaction.isRepliable()) {
      await interaction.reply({
        content: "❌ Este bot é privado do servidor Jogo do Abate.",
        flags: 64,
      });
    }
    return;
  }

  if (interaction.isButton() || interaction.isModalSubmit()) {
    const handled = await handleRequestComponent(interaction);
    if (handled) return;
  }

  if (!interaction.isChatInputCommand()) return;
  

  if (interaction.guildId !== process.env.DISCORD_GUILD_ID) {
    await interaction.reply({
      content: "❌ Este bot é privado do servidor Jogo do Abate.",
      flags: 64,
    });
    return;
  }

  try {
    if (interaction.commandName === "vincular") {
      await handleVincular(interaction);
      return;
    }

    if (interaction.commandName === "vinculo") {
      await handleVinculo(interaction);
      return;
    }

    if (interaction.commandName === "desvincular") {
      await handleDesvincular(interaction);
      return;
    }

    if (interaction.commandName === "evento") {
      await handleEvento(interaction);
      return;
    }

    if (interaction.commandName === "player") {
      await handlePlayer(interaction);
      return;
    }

    if (interaction.commandName === "pedidos") {
      await handlePedidos(interaction);
      return;
    }

    if (interaction.commandName === "pedido") {
      await handlePedido(interaction);
      return;
    }

    if (interaction.commandName === "kills") {
      await handleKills(interaction);
      return;
    }

    if (interaction.commandName === "adminpontos") {
      await handleAdminPontos(interaction);
      return;
    }

    if (interaction.commandName === "adminvidas") {
      await handleAdminVidas(interaction);
      return;
    }

    if (interaction.commandName === "adminboss") {
      await handleAdminBoss(interaction);
      return;
    }

    if (interaction.commandName === "adminpedido") {
      await handleAdminPedido(interaction);
      return;
    }

    if (interaction.commandName === "setup_panel") {
      await handleSetupPanel(interaction);
      return;
    }
  } catch (error) {
    console.error("[CullingBot] Erro no comando:", error);

    const message =
      "❌ Ocorreu um erro ao processar o comando. Tente novamente ou chame a staff.";

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: message });
    } else {
      await interaction.reply({
        content: message,
        flags: 64,
      });
    }
  }
    if (interaction.commandName === "botstatus") {
      await handleBotStatus(interaction);
      return;
    }

    if (interaction.commandName === "acoes") {
      await handleAcoes(interaction);
      return;
    }

    if (interaction.commandName === "acao") {
      await handleAcao(interaction);
      return;
    }

}

async function processVincularLogic(code, discordId, discordName, guild) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [codes] = await connection.execute(
      `
      SELECT id, minecraft_uuid, minecraft_name, code, expires_at, used
      FROM culling_discord_link_codes
      WHERE code = ?
        AND used = 0
        AND expires_at > NOW()
      LIMIT 1
      FOR UPDATE
      `,
      [code]
    );

    if (codes.length === 0) {
      await connection.rollback();
      return "❌ Código inválido ou expirado.\nUse `/discord vincular` novamente dentro do Minecraft.";
    }

    const linkCode = codes[0];

    const [existingDiscordLinks] = await connection.execute(
      `
      SELECT minecraft_uuid, minecraft_name
      FROM culling_discord_links
      WHERE discord_id = ?
        AND minecraft_uuid <> ?
      LIMIT 1
      `,
      [discordId, linkCode.minecraft_uuid]
    );

    if (existingDiscordLinks.length > 0) {
      await connection.rollback();
      return `❌ Este Discord já está vinculado ao Minecraft **${existingDiscordLinks[0].minecraft_name}**.\nPeça ajuda à staff se isso estiver errado.`;
    }

    await connection.execute(
      `
      INSERT INTO culling_discord_links
        (minecraft_uuid, minecraft_name, discord_id, discord_name, linked_by)
      VALUES
        (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        minecraft_name = VALUES(minecraft_name),
        discord_id = VALUES(discord_id),
        discord_name = VALUES(discord_name),
        linked_by = VALUES(linked_by),
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        linkCode.minecraft_uuid,
        linkCode.minecraft_name,
        discordId,
        discordName,
        "BOT",
      ]
    );

    await connection.execute(
      `
      UPDATE culling_discord_link_codes
      SET used = 1,
          used_at = NOW(),
          discord_id = ?,
          discord_name = ?
      WHERE id = ?
      `,
      [discordId, discordName, linkCode.id]
    );

    await connection.commit();

    const roleResult = await ensureJogadoresRole(guild, discordId);

    return `✅ Conta vinculada com sucesso!\n\n**Minecraft:** ${linkCode.minecraft_name}\n**Discord:** <@${discordId}>\n**Cargo:** ${formatRoleResult(roleResult)}`;

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function handleVincular(interaction) {
  await interaction.deferReply({ flags: 64 });

  const rawCode = interaction.options.getString("codigo", true);
  const code = rawCode.trim().toUpperCase();
  const discordId = interaction.user.id;
  const discordName = interaction.user.tag || interaction.user.username;

  try {
    const resultMsg = await processVincularLogic(code, discordId, discordName, interaction.guild);
    await interaction.editReply(resultMsg);
  } catch (error) {
    console.error("Erro no vincular:", error);
    await interaction.editReply("❌ Ocorreu um erro interno ao processar o vínculo.");
  }
}

async function handleMessageCreate(message) {
  if (message.author.bot) return;

  const args = message.content.trim().split(/ +/);
  if (args[0].toLowerCase() === "/vincular") {
    // Apaga a mensagem para esconder o código e não poluir
    message.delete().catch(() => null);

    if (args.length < 2) {
      const reply = await message.reply("❌ Forneça o código de vínculo! Ex: `/vincular XYZ123`");
      setTimeout(() => reply.delete().catch(() => null), 10000);
      return;
    }

    const code = args[1].toUpperCase();
    const discordId = message.author.id;
    const discordName = message.author.tag || message.author.username;

    try {
      const resultMsg = await processVincularLogic(code, discordId, discordName, message.guild);
      
      // Tenta enviar via DM para simular o ephemeral
      message.author.send(resultMsg).catch(async () => {
        // Se a DM estiver fechada, manda no chat e apaga depois
        const reply = await message.reply(resultMsg);
        setTimeout(() => reply.delete().catch(() => null), 10000);
      });
    } catch (error) {
      console.error("Erro no messageCreate vincular:", error);
      const reply = await message.reply("❌ Ocorreu um erro interno ao processar o vínculo.");
      setTimeout(() => reply.delete().catch(() => null), 10000);
    }
  }
}

async function handleVinculo(interaction) {
  await interaction.deferReply({ flags: 64 });

  const pool = getPool();
  const discordId = interaction.user.id;

  const [rows] = await pool.execute(
    `
    SELECT minecraft_name, linked_at
    FROM culling_discord_links
    WHERE discord_id = ?
    LIMIT 1
    `,
    [discordId]
  );

  if (rows.length === 0) {
    await interaction.editReply(
      "❌ Seu Discord ainda não está vinculado.\nUse `/discord vincular` no Minecraft e depois `/vincular <codigo>` aqui."
    );
    return;
  }

  await interaction.editReply(
    `✅ Seu Discord está vinculado ao Minecraft **${rows[0].minecraft_name}**.`
  );
}

async function handleDesvincular(interaction) {
  await interaction.deferReply({ flags: 64 });

  const pool = getPool();
  const discordId = interaction.user.id;

  const [rows] = await pool.execute(
    `
    SELECT minecraft_name
    FROM culling_discord_links
    WHERE discord_id = ?
    LIMIT 1
    `,
    [discordId]
  );

  if (rows.length === 0) {
    await interaction.editReply("❌ Você não possui vínculo ativo.");
    return;
  }

  await pool.execute(
    `
    DELETE FROM culling_discord_links
    WHERE discord_id = ?
    `,
    [discordId]
  );

  await interaction.editReply(
    `✅ Vínculo removido com sucesso.\nMinecraft desvinculado: **${rows[0].minecraft_name}**.`
  );
}

async function deleteExpiredCodes() {
  try {
    const pool = getPool();

    const [result] = await pool.execute(
      `
      DELETE FROM culling_discord_link_codes
      WHERE used = 0
        AND expires_at < NOW()
      `
    );

    if (result.affectedRows > 0) {
      console.log(
        `[CullingBot] Códigos expirados removidos: ${result.affectedRows}`
      );
    }
  } catch (error) {
    console.error("[CullingBot] Erro ao limpar códigos expirados:", error);
  }
}

module.exports = {
  handleInteraction,
  deleteExpiredCodes,
  handleMessageCreate,
};