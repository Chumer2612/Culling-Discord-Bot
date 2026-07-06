const { REST, Routes, SlashCommandBuilder } = require("discord.js");

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("vincular")
      .setDescription("Vincula sua conta Discord ao Minecraft no Jogo do Abate")
      .addStringOption((option) =>
        option
          .setName("codigo")
          .setDescription("Código gerado pelo /discord vincular no Minecraft")
          .setRequired(true)
      )
      .toJSON(),

    new SlashCommandBuilder()
      .setName("vinculo")
      .setDescription("Mostra qual Minecraft está vinculado ao seu Discord")
      .toJSON(),

    new SlashCommandBuilder()
      .setName("desvincular")
      .setDescription("Remove o vínculo do seu Discord com o Minecraft")
      .toJSON(),

    new SlashCommandBuilder()
      .setName("evento")
      .setDescription("Staff: mostra um resumo do evento")
      .toJSON(),

    new SlashCommandBuilder()
      .setName("player")
      .setDescription("Staff: mostra dados de um jogador")
      .addStringOption((option) =>
        option
          .setName("nick")
          .setDescription("Nick do jogador no Minecraft")
          .setRequired(true)
      )
      .toJSON(),

    new SlashCommandBuilder()
      .setName("pedidos")
      .setDescription("Staff: lista pedidos do evento")
      .addStringOption((option) =>
        option
          .setName("status")
          .setDescription("Filtrar por status")
          .setRequired(false)
          .addChoices(
            { name: "Pendentes", value: "PENDING" },
            { name: "Aprovados", value: "APPROVED" },
            { name: "Negados", value: "DENIED" },
            { name: "Adaptados", value: "ADAPTED" },
            { name: "Concluídos", value: "COMPLETED" },
            { name: "Todos", value: "ALL" }
          )
      )
      .toJSON(),

    new SlashCommandBuilder()
      .setName("pedido")
      .setDescription("Staff: mostra detalhes de um pedido")
      .addIntegerOption((option) =>
        option
          .setName("id")
          .setDescription("ID do pedido")
          .setRequired(true)
          .setMinValue(1)
      )
      .toJSON(),

    new SlashCommandBuilder()
      .setName("kills")
      .setDescription("Staff: mostra kills recentes ou kills de um jogador")
      .addStringOption((option) =>
        option
          .setName("nick")
          .setDescription("Nick do jogador no Minecraft")
          .setRequired(false)
      )
      .toJSON(),

    new SlashCommandBuilder()
      .setName("adminpontos")
      .setDescription("Admin: executa comando de pontos pelo plugin")
      .addStringOption((option) =>
        option
          .setName("nick")
          .setDescription("Nick do jogador")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("acao")
          .setDescription("Ação")
          .setRequired(true)
          .addChoices(
            { name: "ver", value: "ver" },
            { name: "set", value: "set" },
            { name: "add", value: "add" },
            { name: "remove", value: "remove" }
          )
      )
      .addIntegerOption((option) =>
        option
          .setName("valor")
          .setDescription("Valor para set/add/remove")
          .setRequired(false)
          .setMinValue(0)
      )
      .toJSON(),

    new SlashCommandBuilder()
      .setName("adminvidas")
      .setDescription("Admin: executa comando de vidas pelo plugin")
      .addStringOption((option) =>
        option
          .setName("nick")
          .setDescription("Nick do jogador")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("acao")
          .setDescription("Ação")
          .setRequired(true)
          .addChoices(
            { name: "ver", value: "ver" },
            { name: "set", value: "set" },
            { name: "add", value: "add" },
            { name: "remove", value: "remove" },
            { name: "reset", value: "reset" },
            { name: "eliminar", value: "eliminar" },
            { name: "reviver", value: "reviver" }
          )
      )
      .addIntegerOption((option) =>
        option
          .setName("valor")
          .setDescription("Valor para set/add/remove")
          .setRequired(false)
          .setMinValue(0)
      )
      .toJSON(),

    new SlashCommandBuilder()
      .setName("adminboss")
      .setDescription("Admin: executa comando de boss pelo plugin")
      .addStringOption((option) =>
        option
          .setName("acao")
          .setDescription("Ação")
          .setRequired(true)
          .addChoices(
            { name: "status", value: "status" },
            { name: "start", value: "start" },
            { name: "cancel", value: "cancel" }
          )
      )
      .toJSON(),

    new SlashCommandBuilder()
      .setName("adminpedido")
      .setDescription("Admin: executa comando de pedidos pelo plugin")
      .addStringOption((option) =>
        option
          .setName("acao")
          .setDescription("Ação")
          .setRequired(true)
          .addChoices(
            { name: "aprovar", value: "aprovar" },
            { name: "negar", value: "negar" },
            { name: "adaptar", value: "adaptar" },
            { name: "concluir", value: "concluir" }
          )
      )
      .addIntegerOption((option) =>
        option
          .setName("id")
          .setDescription("ID do pedido")
          .setRequired(true)
          .setMinValue(1)
      )
      .addStringOption((option) =>
        option
          .setName("texto")
          .setDescription("Motivo, observação ou texto adaptado")
          .setRequired(true)
      )
      .toJSON(),

          new SlashCommandBuilder()
      .setName("botstatus")
      .setDescription("Staff: mostra status do bot, MySQL e filas")
      .toJSON(),

    new SlashCommandBuilder()
      .setName("acoes")
      .setDescription("Staff: lista ações administrativas recentes")
      .addStringOption((option) =>
        option
          .setName("status")
          .setDescription("Filtrar por status")
          .setRequired(false)
          .addChoices(
            { name: "Todos", value: "ALL" },
            { name: "Pendentes", value: "PENDING" },
            { name: "Processando", value: "PROCESSING" },
            { name: "Concluídos", value: "DONE" },
            { name: "Falhados", value: "FAILED" }
          )
      )
      .addIntegerOption((option) =>
        option
          .setName("limite")
          .setDescription("Quantidade de ações, de 1 a 20")
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(20)
      )
      .toJSON(),

    new SlashCommandBuilder()
      .setName("acao")
      .setDescription("Staff: mostra detalhes de uma ação administrativa")
      .addIntegerOption((option) =>
        option
          .setName("id")
          .setDescription("ID da ação")
          .setRequired(true)
          .setMinValue(1)
      )
      .toJSON(),
      
    new SlashCommandBuilder()
      .setName("setup_panel")
      .setDescription("[STAFF] Inicializa um painel automático (Regras ou Condição)")
      .addStringOption((option) =>
        option
          .setName("tipo")
          .setDescription("Qual painel será inicializado aqui?")
          .setRequired(true)
          .addChoices(
            { name: "Regras", value: "REGRAS" },
            { name: "Condição de Vitória", value: "CONDICAO_VITORIA" }
          )
      )
      .toJSON(),
  ];

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(
      process.env.DISCORD_CLIENT_ID,
      process.env.DISCORD_GUILD_ID
    ),
    { body: commands }
  );

  console.log("[CullingBot] Slash commands registrados.");
}

module.exports = {
  registerCommands,
};