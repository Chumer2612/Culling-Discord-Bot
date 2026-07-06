const { ROLES } = require("./config");

async function ensureJogadoresRole(guild, discordId) {
  if (!guild) {
    return {
      status: "failed",
      message: "Servidor Discord não encontrado na interação.",
    };
  }

  const roleId = ROLES.JOGADORES;

  if (!roleId || roleId.trim() === "") {
    return {
      status: "failed",
      message: "ROLE_JOGADORES não configurado no .env.",
    };
  }

  try {
    const member = await guild.members.fetch(discordId);

    if (!member) {
      return {
        status: "failed",
        message: "Membro não encontrado no servidor.",
      };
    }

    let role = guild.roles.cache.get(roleId);

    if (!role) {
      role = await guild.roles.fetch(roleId);
    }

    if (!role) {
      return {
        status: "failed",
        message: "Cargo Jogadores não encontrado pelo ID configurado.",
      };
    }

    if (member.roles.cache.has(roleId)) {
      return {
        status: "already",
        message: "O usuário já tinha o cargo Jogadores.",
      };
    }

    await member.roles.add(roleId, "Vinculação Minecraft ↔ Discord no Jogo do Abate");

    return {
      status: "added",
      message: "Cargo Jogadores atribuído automaticamente.",
    };
  } catch (error) {
    return {
      status: "failed",
      message: String(error.message || error),
    };
  }
}

function formatRoleResult(result) {
  if (!result) {
    return "⚠️ Cargo Jogadores: não verificado.";
  }

  if (result.status === "already") {
    return "✅ Cargo Jogadores: usuário já possuía.";
  }

  if (result.status === "added") {
    return "✅ Cargo Jogadores: atribuído automaticamente.";
  }

  return `⚠️ Cargo Jogadores: falhou ao atribuir. Motivo: ${result.message}`;
}

module.exports = {
  ensureJogadoresRole,
  formatRoleResult,
};