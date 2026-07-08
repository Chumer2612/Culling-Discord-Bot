import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class ChatService {
  private get botToken() { return process.env.DISCORD_TOKEN; }
  private get guildId() { return process.env.DISCORD_GUILD_ID; }

  async getChannels() {
    try {
      const res = await fetch(`https://discord.com/api/v10/guilds/${this.guildId}/channels`, {
        headers: { Authorization: `Bot ${this.botToken}` }
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('Discord API Error:', errText, 'Token:', this.botToken, 'Guild:', this.guildId);
        throw new Error('Falha ao buscar canais do Discord');
      }
      const channels = await res.json();
      // Filtrar apenas canais de texto (type = 0) ou anúncios (type = 5)
      return channels
        .filter((c: any) => c.type === 0 || c.type === 5)
        .map((c: any) => ({ id: c.id, name: c.name }));
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Erro ao buscar canais');
    }
  }

  async sendMessage(body: any) {
    try {
      const { channelId, content, embedTitle, embedDescription, embedColor } = body;

      const messageData: any = {};
      if (content) messageData.content = content;

      if (embedTitle || embedDescription) {
        const embed: any = {};
        if (embedTitle) embed.title = embedTitle;
        if (embedDescription) embed.description = embedDescription;
        if (embedColor) embed.color = parseInt(embedColor.replace('#', ''), 16);
        messageData.embeds = [embed];
      }

      const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { 
          Authorization: `Bot ${this.botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      if (!res.ok) {
        const errJson = await res.json();
        console.error('Erro no Discord API:', errJson);
        throw new Error('Falha ao enviar mensagem via Discord REST');
      }

      return { success: true };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Erro ao enviar mensagem');
    }
  }
}
