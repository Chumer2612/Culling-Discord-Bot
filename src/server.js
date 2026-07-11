const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const { getPool } = require("./database");
const { client } = require("./config");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "culling_secret_key_123";

// Middleware de Autenticação
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Acesso Negado" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token Inválido" });
    req.user = user;
    next();
  });
}

// Rota de Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Faltam dados" });

    const pool = getPool();
    const [users] = await pool.execute("SELECT * FROM culling_dashboard_users WHERE username = ?", [username]);

    if (users.length === 0) {
      return res.status(401).json({ error: "Usuário ou senha incorretos" });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (valid) {
      const token = jwt.sign({ id: user.id, username: user.username, admin: true }, JWT_SECRET, { expiresIn: "24h" });
      res.json({ token, username: user.username });
    } else {
      res.status(401).json({ error: "Usuário ou senha incorretos" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Usuários (Dashboard)
app.get("/api/users", authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const [users] = await pool.execute("SELECT id, username, created_at FROM culling_dashboard_users ORDER BY id ASC");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Erro interno" });
  }
});

app.post("/api/users", authenticateToken, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Faltam dados" });

    const pool = getPool();
    const [existing] = await pool.execute("SELECT id FROM culling_dashboard_users WHERE username = ?", [username]);
    if (existing.length > 0) return res.status(400).json({ error: "Usuário já existe" });

    const hashed = await bcrypt.hash(password, 10);
    await pool.execute("INSERT INTO culling_dashboard_users (username, password_hash) VALUES (?, ?)", [username, hashed]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro interno" });
  }
});

app.delete("/api/users/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (String(id) === String(req.user.id)) return res.status(400).json({ error: "Você não pode excluir a si mesmo" });

    const pool = getPool();
    await pool.execute("DELETE FROM culling_dashboard_users WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro interno" });
  }
});

// Estatísticas
app.get("/api/stats", authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const [[{ total_players }]] = await pool.execute("SELECT COUNT(*) as total_players FROM culling_players");
    const [[{ total_requests }]] = await pool.execute("SELECT COUNT(*) as total_requests FROM culling_victory_requests WHERE status = 'PENDING'");
    
    res.json({
      totalPlayers: total_players,
      pendingRequests: total_requests,
      botLatency: client.ws.ping
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno" });
  }
});

// Jogadores
app.get("/api/players", authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const query = `
      SELECT 
        p.uuid, 
        p.name as player_name, 
        p.points as fame_points, 
        p.lives as current_lives,
        COUNT(k.id) as kills
      FROM culling_players p
      LEFT JOIN culling_kills k ON p.uuid = k.killer_uuid
      GROUP BY p.uuid
      ORDER BY p.points DESC
    `;
    const [players] = await pool.execute(query);
    res.json(players);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno" });
  }
});

// Ações de Administrador sobre o Jogador (Dashboard)
app.post("/api/players/:uuid/action", authenticateToken, async (req, res) => {
  try {
    const { uuid } = req.params;
    const { action, value } = req.body; // action: 'addVidas', 'removeVidas', 'reviver', 'addPontos', 'removePontos'
    const pool = getPool();

    const [[player]] = await pool.execute("SELECT name FROM culling_players WHERE uuid = ?", [uuid]);
    if (!player) return res.status(404).json({ error: "Jogador não encontrado" });

    let minecraftCommand = "";
    if (action === "addVidas") minecraftCommand = `/cullingadmin vidas add ${player.name} ${value}`;
    else if (action === "removeVidas") minecraftCommand = `/cullingadmin vidas remove ${player.name} ${value}`;
    else if (action === "reviver") minecraftCommand = `/cullingadmin vidas reviver ${player.name}`;
    else if (action === "addPontos") minecraftCommand = `/cullingadmin pontos add ${player.name} ${value}`;
    else if (action === "removePontos") minecraftCommand = `/cullingadmin pontos remove ${player.name} ${value}`;
    else return res.status(400).json({ error: "Ação inválida" });

    await pool.execute(
      `INSERT INTO culling_discord_admin_actions (discord_id, discord_name, action_type, minecraft_command, status)
       VALUES (?, ?, ?, ?, 'PENDING')`,
      ["Dashboard", "Painel Web", action.includes("Pontos") ? "PONTOS" : "VIDAS", minecraftCommand]
    );

    res.json({ success: true, message: "Ação enviada para a fila" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno" });
  }
});

// Últimas Atividades (Kills e Admin Actions)
app.get("/api/activities", authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    // Pega as últimas 10 kills
    const [kills] = await pool.execute(`
      SELECT 
        id, 
        'kill' as type,
        killer_name, 
        victim_name, 
        created_at
      FROM culling_kills
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Pega as últimas 10 ações admin do dashboard ou bot
    const [actions] = await pool.execute(`
      SELECT 
        id,
        'admin_action' as type,
        discord_name,
        minecraft_command,
        created_at
      FROM culling_discord_admin_actions
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Junta as duas listas, ordena por data decrescente e pega as 15 mais recentes
    const activities = [...kills, ...actions]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 15);

    res.json(activities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno" });
  }
});

// Pedidos
app.get("/api/requests", authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const [requests] = await pool.execute("SELECT * FROM culling_victory_requests ORDER BY created_at DESC");
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno" });
  }
});

const upload = multer({ storage: multer.memoryStorage() });

// Chat as Bot
app.post("/api/chat", authenticateToken, upload.single("imageFile"), async (req, res) => {
  try {
    const { channelId, content, embedTitle, embedDescription, embedImage, embedColor } = req.body;
    
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      return res.status(400).json({ error: "Canal inválido" });
    }

    const messageData = {};
    if (content) messageData.content = content;
    
    let attachment = null;
    if (req.file) {
      const { AttachmentBuilder } = require("discord.js");
      attachment = new AttachmentBuilder(req.file.buffer, { name: req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "") || 'image.png' });
    }
    
    if (embedTitle || embedDescription || embedImage || attachment) {
      const { EmbedBuilder } = require("discord.js");
      const embed = new EmbedBuilder();
      if (embedTitle) embed.setTitle(embedTitle);
      if (embedDescription) embed.setDescription(embedDescription);
      
      if (attachment) {
        embed.setImage(`attachment://${attachment.name}`);
      } else if (embedImage) {
        embed.setImage(embedImage);
      }
      
      if (embedColor) embed.setColor(parseInt(String(embedColor).replace("#", ""), 16));
      
      messageData.embeds = [embed];
      if (attachment) messageData.files = [attachment];
    }

    await channel.send(messageData);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
});

// Canais Disponíveis (Para o Chat)
app.get("/api/channels", authenticateToken, async (req, res) => {
  try {
    let channels = client.channels.cache
      .filter(c => c.isTextBased())
      .map(c => ({ id: c.id, name: c.name, position: c.rawPosition || c.position || 0 }));
      
    const priorityChannels = [
      "1517638047225614367", // abate-anuncios
      "1517638300515434607", // abate-chat
      "1149928228455202838", // chat-comum
      "1149929224954712166"  // dark-chat
    ];

    channels.sort((a, b) => {
      const idxA = priorityChannels.indexOf(a.id);
      const idxB = priorityChannels.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.position - b.position;
    });
    
    res.json(channels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno" });
  }
});

// Cargos Disponíveis
app.get("/api/roles", authenticateToken, async (req, res) => {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return res.json([]);
    let roles = guild.roles.cache
      .filter(r => r.name !== '@everyone')
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor, position: r.rawPosition || r.position || 0 }));
      
    const priorityRoles = [
      "1521382455171612792" // Jogadores
    ];

    roles.sort((a, b) => {
      const idxA = priorityRoles.indexOf(a.id);
      const idxB = priorityRoles.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b.position - a.position;
    });
    
    res.json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno" });
  }
});

// Membros Disponíveis
app.get("/api/members", authenticateToken, async (req, res) => {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return res.json([]);
    
    try {
      await guild.members.fetch();
    } catch (e) {
      console.warn("[CullingBot] Aviso: falha no fetch de membros (Verifique o Intent de Membros no portal do Discord):", e.message);
    }

    let members = guild.members.cache
      .filter(m => !m.user.bot)
      .map(m => ({
        id: m.id,
        displayName: m.displayName,
        username: m.user.username
      }));
      
    members.sort((a, b) => a.displayName.localeCompare(b.displayName));
    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno" });
  }
});

// Aprovar/Negar Pedido pelo Web
app.post("/api/requests/:id/status", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, staffNotes, adaptedText } = req.body;
    
    const pool = getPool();

    // 1. Buscar a request original
    const [originalRows] = await pool.execute("SELECT * FROM culling_victory_requests WHERE id = ?", [id]);
    if (originalRows.length === 0) return res.status(404).json({ error: "Pedido não encontrado" });
    const originalRequest = originalRows[0];

    // 2. Atualizar status
    if (status === 'ADAPTED' && adaptedText) {
      await pool.execute(
        "UPDATE culling_victory_requests SET status = ?, staff_notes = ?, adapted_text = ?, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?",
        [status, staffNotes || null, adaptedText, req.user.username || 'Dashboard', id]
      );
    } else {
      await pool.execute(
        "UPDATE culling_victory_requests SET status = ?, staff_notes = ?, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?",
        [status, staffNotes || null, req.user.username || 'Dashboard', id]
      );
    }

    // 3. Sistema de Reembolso e Notificação
    const playerUuid = originalRequest.player_uuid;
    const playerName = originalRequest.player_name;
    const cost = originalRequest.cost;
    const reqType = originalRequest.request_type === 'RULE' ? 'Regra' : 'Condição de Vitória';
    let notificationMsg = "";

    if (status === 'DENIED') {
      // Devolver os pontos se o custo for > 0
      if (cost > 0) {
        await pool.execute(
          `INSERT INTO culling_discord_admin_actions (discord_id, discord_name, action_type, minecraft_command, status)
           VALUES ('Dashboard', 'Painel Web', 'REFUND', ?, 'PENDING')`,
          [`/cullingadmin pontos add ${playerName} ${cost}`]
        );
      }
      notificationMsg = `§c§l[!] SEU PEDIDO FOI NEGADO!\n§cTipo: §f${reqType}\n§cMotivo: §f${staffNotes || "Não informado"}\n§aSeus ${cost} pontos foram reembolsados!`;
    } else if (status === 'APPROVED') {
      notificationMsg = `§a§l[!] SEU PEDIDO FOI APROVADO!\n§aTipo: §f${reqType}\n§aMotivo/Nota: §f${staffNotes || "Aprovado sem ressalvas!"}`;
    } else if (status === 'ADAPTED') {
      notificationMsg = `§e§l[!] SEU PEDIDO FOI ADAPTADO!\n§eTipo: §f${reqType}\n§eTexto Oficial: §f${adaptedText}\n§eMotivo da Mudança: §f${staffNotes || "Balanceamento padrão."}`;
    }

    if (notificationMsg) {
      await pool.execute(
        "INSERT INTO culling_offline_notifications (player_uuid, message) VALUES (?, ?)",
        [playerUuid, notificationMsg]
      );
    }

    // Dispara Sync
    const { syncPanels } = require("./panels");
    await syncPanels().catch(console.error);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar pedido" });
  }
});

// Criar Regra ou Condição Oficial Manualmente
app.post("/api/requests/manual", authenticateToken, async (req, res) => {
  try {
    const { type, text } = req.body;
    if (!type || !text) return res.status(400).json({ error: "Faltam dados" });

    const pool = getPool();
    await pool.execute(
      `INSERT INTO culling_victory_requests 
      (player_uuid, player_name, request_type, cost, status, notes, resolved_by, resolved_at) 
      VALUES ('00000000-0000-0000-0000-000000000000', 'Staff', ?, 0, 'APPROVED', ?, 'Dashboard', CURRENT_TIMESTAMP)`,
      [type, text]
    );

    // Dispara Sync
    const { syncPanels } = require("./panels");
    await syncPanels().catch(console.error);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar regra oficial" });
  }
});

// Editar texto de uma regra/condição
app.put("/api/requests/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    
    if (!text) return res.status(400).json({ error: "Texto vazio" });

    const pool = getPool();
    await pool.execute(
      "UPDATE culling_victory_requests SET notes = ?, adapted_text = NULL WHERE id = ?",
      [text, id]
    );

    // Dispara Sync
    const { syncPanels } = require("./panels");
    await syncPanels().catch(console.error);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar regra" });
  }
});

// Excluir uma regra/condição
app.delete("/api/requests/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const pool = getPool();
    await pool.execute("DELETE FROM culling_victory_requests WHERE id = ?", [id]);

    // Dispara Sync
    const { syncPanels } = require("./panels");
    await syncPanels().catch(console.error);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao excluir regra" });
  }
});

// Servir frontend compilado
app.use(express.static(path.join(__dirname, "../dashboard/dist")));
app.use((req, res) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, "../dashboard/dist/index.html"));
  } else {
    res.status(404).json({ error: "Rota não encontrada" });
  }
});

function startServer(port = 3000) {
  app.listen(port, () => {
    console.log(`[CullingBot] Dashboard Web rodando na porta ${port}`);
  });
}

module.exports = { startServer };
