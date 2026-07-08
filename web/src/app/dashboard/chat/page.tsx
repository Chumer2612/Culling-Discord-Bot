"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquare, Send, Loader2 } from "lucide-react";

export default function ChatPage() {
  const [channels, setChannels] = useState<{id: string, name: string}[]>([]);
  const [channelId, setChannelId] = useState("");
  const [content, setContent] = useState("");
  const [embedTitle, setEmbedTitle] = useState("");
  const [embedDescription, setEmbedDescription] = useState("");
  const [embedColor, setEmbedColor] = useState("#9c27b0"); // Default purple
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/chat/channels")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setChannels(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSend = async () => {
    if (!channelId) return toast.error("Selecione um canal");
    if (!content && !embedTitle && !embedDescription) return toast.error("A mensagem não pode estar vazia");

    setSending(true);
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, content, embedTitle, embedDescription, embedColor })
      });
      if (!res.ok) throw new Error("Falha na API");
      
      toast.success("Mensagem enviada com sucesso!");
      setContent("");
      setEmbedTitle("");
      setEmbedDescription("");
    } catch (err) {
      toast.error("Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Chat do Bot</h2>
        <p className="text-muted-foreground mt-2">Envie mensagens oficiais no servidor através do Kogane.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              Compositor de Mensagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Canal de Destino</Label>
              <Select value={channelId} onValueChange={(val) => setChannelId(val as string)}>
                <SelectTrigger className="bg-black/50 border-white/10">
                  <SelectValue placeholder={loading ? "Carregando canais..." : "Selecione o canal..."} />
                </SelectTrigger>
                <SelectContent className="bg-popover/90 backdrop-blur-xl border-white/10">
                  {channels.map(c => (
                    <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conteúdo do Texto (Opcional)</Label>
              <Textarea 
                placeholder="Texto simples..." 
                className="bg-black/50 border-white/10"
                value={content}
                onChange={e => setContent(e.target.value)}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <Label className="text-purple-400 font-semibold">Configuração de Embed (Opcional)</Label>
              
              <div className="space-y-2">
                <Label>Título do Embed</Label>
                <Input 
                  placeholder="Ex: Anúncio Importante" 
                  className="bg-black/50 border-white/10"
                  value={embedTitle}
                  onChange={e => setEmbedTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição do Embed</Label>
                <Textarea 
                  placeholder="Texto do embed..." 
                  className="bg-black/50 border-white/10 h-32"
                  value={embedDescription}
                  onChange={e => setEmbedDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Cor do Embed (HEX)</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color" 
                    className="w-16 h-10 p-1 bg-black/50 border-white/10 cursor-pointer"
                    value={embedColor}
                    onChange={e => setEmbedColor(e.target.value)}
                  />
                  <Input 
                    type="text" 
                    className="flex-1 bg-black/50 border-white/10 font-mono"
                    value={embedColor}
                    onChange={e => setEmbedColor(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleSend} disabled={sending} className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-4">
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar Mensagem
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-panel border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-xl">Preview em Tempo Real</CardTitle>
            <CardDescription>Como a mensagem ficará no Discord</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-[#313338] rounded-md p-4 text-[#dbdee1] flex gap-4 mt-2">
              <div className="w-10 h-10 rounded-full bg-purple-900 shrink-0 flex items-center justify-center text-white font-bold">
                K
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-white">Kogane</span>
                  <span className="bg-[#5865F2] text-xs px-1.5 py-0.5 rounded text-white font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16"><path d="M12.44 2.193a.5.5 0 0 0-.705.02L8 5.86 4.265 2.213a.5.5 0 0 0-.73.684l3.99 3.99a.5.5 0 0 0 .73 0l4.205-4.205a.5.5 0 0 0-.02-.705z"/></svg>
                    BOT
                  </span>
                  <span className="text-[#949ba4] text-xs">Hoje às 12:00</span>
                </div>
                
                {content && <p className="mt-1 whitespace-pre-wrap">{content}</p>}

                {(embedTitle || embedDescription) && (
                  <div className="mt-2 flex">
                    <div className="w-1 rounded-l-sm" style={{ backgroundColor: embedColor }}></div>
                    <div className="bg-[#2b2d31] border border-black/10 rounded-r-md p-4 flex-1">
                      {embedTitle && <div className="font-semibold text-white text-base mb-1">{embedTitle}</div>}
                      {embedDescription && <div className="text-sm whitespace-pre-wrap leading-relaxed text-[#dbdee1]">{embedDescription}</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
