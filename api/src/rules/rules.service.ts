import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class RulesService {
  private readonly botToken = process.env.DISCORD_TOKEN;

  constructor(private readonly db: DatabaseService) {}

  async getRequests() {
    try {
      const [requests] = await this.db.query('SELECT * FROM culling_victory_requests ORDER BY created_at DESC');
      return requests;
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar pedidos');
    }
  }

  async createManualRequest(body: any) {
    try {
      const { type, text } = body;
      await this.db.query(
        `INSERT INTO culling_victory_requests 
        (player_uuid, player_name, request_type, cost, status, notes, resolved_by, resolved_at) 
        VALUES ('00000000-0000-0000-0000-000000000000', 'Staff', ?, 0, 'APPROVED', ?, 'Dashboard', CURRENT_TIMESTAMP)`,
        [type, text]
      );
      await this.syncPanels();
      return { success: true };
    } catch (error) {
      throw new InternalServerErrorException('Erro ao criar regra manual');
    }
  }

  async updateRequestStatus(id: string, body: any, username: string) {
    try {
      const { status, staffNotes, adaptedText } = body;
      
      const [originalRows]: any = await this.db.query("SELECT * FROM culling_victory_requests WHERE id = ?", [id]);
      if (originalRows.length === 0) throw new NotFoundException('Pedido não encontrado');
      const originalRequest = originalRows[0];

      if (status === 'ADAPTED' && adaptedText) {
        await this.db.query(
          "UPDATE culling_victory_requests SET status = ?, staff_notes = ?, adapted_text = ?, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?",
          [status, staffNotes || null, adaptedText, username || 'Dashboard', id]
        );
      } else {
        await this.db.query(
          "UPDATE culling_victory_requests SET status = ?, staff_notes = ?, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?",
          [status, staffNotes || null, username || 'Dashboard', id]
        );
      }

      // Reembolso e Notificação
      const playerUuid = originalRequest.player_uuid;
      const playerName = originalRequest.player_name;
      const cost = originalRequest.cost;
      const reqType = originalRequest.request_type === 'RULE' ? 'Regra' : 'Condição de Vitória';
      let notificationMsg = "";

      if (status === 'DENIED') {
        if (cost > 0) {
          await this.db.query(
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
        await this.db.query(
          "INSERT INTO culling_offline_notifications (player_uuid, message) VALUES (?, ?)",
          [playerUuid, notificationMsg]
        );
      }

      await this.syncPanels();
      return { success: true };
    } catch (error) {
      console.error(error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Erro ao atualizar pedido');
    }
  }

  async editRequestText(id: string, body: any) {
    try {
      const { text } = body;
      await this.db.query(
        "UPDATE culling_victory_requests SET notes = ?, adapted_text = NULL WHERE id = ?",
        [text, id]
      );
      await this.syncPanels();
      return { success: true };
    } catch (error) {
      throw new InternalServerErrorException('Erro ao editar texto');
    }
  }

  async deleteRequest(id: string) {
    try {
      await this.db.query("DELETE FROM culling_victory_requests WHERE id = ?", [id]);
      await this.syncPanels();
      return { success: true };
    } catch (error) {
      throw new InternalServerErrorException('Erro ao excluir pedido');
    }
  }

  // Lógica de Sync convertida para REST
  private async syncPanels() {
    console.log("[RulesService] Sincronizando painéis dinâmicos via REST...");
    await this.updatePanel("REGRAS");
    await this.updatePanel("CONDICAO_VITORIA");
  }

  private async updatePanel(panelType: string) {
    try {
      const [rows]: any = await this.db.query(
        `SELECT channel_id, message_id FROM culling_discord_panels WHERE panel_type = ? LIMIT 1`,
        [panelType]
      );

      if (rows.length === 0) return;
      const { channel_id, message_id } = rows[0];

      let embeds = [];
      if (panelType === "REGRAS") {
        embeds = await this.buildRulesEmbeds();
      } else if (panelType === "CONDICAO_VITORIA") {
        embeds = await this.buildVictoryEmbeds();
      }

      const res = await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages/${message_id}`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bot ${this.botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ embeds })
      });

      if (!res.ok) {
        console.error(`Erro ao atualizar painel ${panelType}:`, await res.text());
      }
    } catch (error) {
      console.error(`Erro ao atualizar painel ${panelType}:`, error);
    }
  }

  private async buildRulesEmbeds() {
    const [rows]: any = await this.db.query(`
      SELECT id, player_name, adapted_text, notes, resolved_at 
      FROM culling_victory_requests 
      WHERE request_type = 'RULE' AND status IN ('APPROVED', 'ADAPTED') 
      ORDER BY resolved_at ASC
    `);

    const embeds = [];
    let currentEmbed = {
      title: "📜 Regras do Jogo do Abate",
      color: 0x00aaff,
      description: "Aqui estão listadas todas as regras aprovadas oficialmente pela Staff.\n\n",
      footer: { text: "Jogo do Abate • Atualizado dinamicamente" },
      timestamp: new Date().toISOString()
    };

    if (rows.length === 0) {
      currentEmbed.description = "Ainda não há nenhuma regra aprovada.";
      return [currentEmbed];
    }

    let count = 1;
    let currentDesc = currentEmbed.description;

    for (const row of rows) {
      const text = row.adapted_text && row.adapted_text.trim() !== "" ? row.adapted_text : row.notes;
      const ruleText = `**${count}.** ${text}\n*Adicionada por: ${row.player_name}*\n\n`;

      if (currentDesc.length + ruleText.length > 4000) {
        currentEmbed.description = currentDesc;
        embeds.push({...currentEmbed});

        currentEmbed = {
          title: "", color: 0x00aaff, description: "",
          footer: { text: "Jogo do Abate • Atualizado dinamicamente" },
          timestamp: new Date().toISOString()
        };
        currentDesc = ruleText;
      } else {
        currentDesc += ruleText;
      }
      count++;
    }

    currentEmbed.description = currentDesc;
    embeds.push(currentEmbed);

    return embeds;
  }

  private async buildVictoryEmbeds() {
    const [rows]: any = await this.db.query(`
      SELECT id, player_name, adapted_text, notes, resolved_at 
      FROM culling_victory_requests 
      WHERE request_type = 'VICTORY_CONDITION' AND status IN ('APPROVED', 'ADAPTED') 
      ORDER BY resolved_at DESC LIMIT 1
    `);

    const embed: any = {
      title: "🏆 Condição de Vitória",
      color: 0xffaa00,
      footer: { text: "Jogo do Abate • Atualizado dinamicamente" },
      timestamp: new Date().toISOString()
    };

    if (rows.length === 0) {
      embed.description = "Nenhuma condição de vitória foi aprovada ainda. A condição padrão está em vigor.";
    } else {
      const row = rows[0];
      const text = row.adapted_text && row.adapted_text.trim() !== "" ? row.adapted_text : row.notes;
      embed.description = `A condição de vitória atual do servidor é:\n\n**${text}**\n\n*Aprovada através do pedido de ${row.player_name}*`;
    }

    return [embed];
  }
}
