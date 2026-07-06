const { ADMIN_USER_IDS, ADMIN_CHANNEL_IDS } = require("./config");

function isAdminUser(userId) {
  return ADMIN_USER_IDS.has(userId);
}

function isAdminChannel(channelId) {
  return ADMIN_CHANNEL_IDS.has(channelId);
}

async function requireBotAdmin(interaction, allowAnyChannel = false) {
  if (!isAdminUser(interaction.user.id)) {
    await interaction.reply({
      content: "❌ Você não está na whitelist administrativa do bot.",
      flags: 64,
    });
    return false;
  }

  if (!allowAnyChannel && !isAdminChannel(interaction.channelId)) {
    await interaction.reply({
      content: "❌ Comandos administrativos do bot só podem ser usados no canal da staff/admin.",
      flags: 64,
    });
    return false;
  }

  return true;
}

module.exports = {
  requireBotAdmin,
  isAdminUser,
  isAdminChannel,
};