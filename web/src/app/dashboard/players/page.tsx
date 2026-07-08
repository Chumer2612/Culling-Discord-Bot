"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MoreHorizontal, Heart, HeartOff, Coins, Skull, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Player = {
  uuid: string;
  name: string;
  discordId: string;
  discordUsername: string;
  discordAvatar: string;
  points: number;
  lives: number;
  fame: number;
  eliminated: boolean;
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [actionType, setActionType] = useState<string | null>(null);
  const [actionValue, setActionValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPlayers = () => {
    fetch("/api/players")
      .then((res) => res.json())
      .then((data) => {
        setPlayers(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const openAction = (player: Player, type: string) => {
    setSelectedPlayer(player);
    setActionType(type);
    setActionValue("");
  };

  const closeAction = () => {
    setSelectedPlayer(null);
    setActionType(null);
    setActionValue("");
  };

  const submitAction = async () => {
    if (!selectedPlayer || !actionType) return;
    
    setIsSubmitting(true);
    try {
      const payload: any = {
        targetName: selectedPlayer.name,
        targetUuid: selectedPlayer.uuid,
        type: actionType,
      };

      if (["PLAYER_LIVES_ADD", "PLAYER_LIVES_SET", "PLAYER_POINTS_ADD"].includes(actionType)) {
        payload.payload = { value: parseInt(actionValue, 10) || 0 };
      }

      const res = await fetch("/api/actions/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Falha ao enviar comando");
      
      toast.success(`Ação ${actionType} enviada com sucesso para ${selectedPlayer.name}!`);
      closeAction();
      fetchPlayers(); // Refresh table
    } catch (err) {
      toast.error("Ocorreu um erro ao enviar a ação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Jogadores ({players.length})</h2>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="w-[80px]">Discord</TableHead>
              <TableHead>Nickname</TableHead>
              <TableHead className="text-center">Vidas</TableHead>
              <TableHead className="text-center">Pontos</TableHead>
              <TableHead className="text-center">Fama</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right pr-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : players.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Nenhum jogador encontrado.
                </TableCell>
              </TableRow>
            ) : (
              players.map((player) => (
                <TableRow key={player.uuid} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell>
                    <Avatar className="w-8 h-8 border border-white/10">
                      {player.discordId ? (
                        <AvatarImage src={`https://cdn.discordapp.com/avatars/${player.discordId}/${player.discordAvatar}.png`} />
                      ) : null}
                      <AvatarFallback>{player.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium text-white/90">
                    {player.name}
                    {player.discordUsername && (
                      <div className="text-[10px] text-muted-foreground">@{player.discordUsername}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-purple-400">{player.lives}</span>
                  </TableCell>
                  <TableCell className="text-center font-mono">{player.points}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-orange-400">{player.fame.toLocaleString()}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {player.eliminated ? (
                      <Badge variant="destructive" className="bg-red-500/20 text-red-400 hover:bg-red-500/30">Eliminado</Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-500/20 text-green-400 hover:bg-green-500/30">Vivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 p-0 border border-transparent hover:border-white/10 flex items-center justify-center rounded-md hover:bg-white/5 transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover/90 backdrop-blur-xl border-white/10">
                        <DropdownMenuLabel>Ações Administrativas</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10" />
                        
                        {!player.eliminated && (
                          <>
                            <DropdownMenuItem onClick={() => openAction(player, "PLAYER_LIVES_ADD")} className="cursor-pointer focus:bg-white/5">
                              <Heart className="mr-2 h-4 w-4 text-green-400" /> Adicionar Vidas
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAction(player, "PLAYER_LIVES_SET")} className="cursor-pointer focus:bg-white/5">
                              <HeartOff className="mr-2 h-4 w-4 text-yellow-400" /> Setar Vidas (Absoluto)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAction(player, "PLAYER_POINTS_ADD")} className="cursor-pointer focus:bg-white/5">
                              <Coins className="mr-2 h-4 w-4 text-orange-400" /> Adicionar Pontos/Fama
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem onClick={() => openAction(player, "PLAYER_ELIMINATE")} className="cursor-pointer focus:bg-destructive/20 text-red-400 focus:text-red-300">
                              <Skull className="mr-2 h-4 w-4" /> Eliminar (Permadeath)
                            </DropdownMenuItem>
                          </>
                        )}

                        {player.eliminated && (
                          <DropdownMenuItem onClick={() => openAction(player, "PLAYER_REVIVE")} className="cursor-pointer focus:bg-purple-500/20 text-purple-400 focus:text-purple-300">
                            <Sparkles className="mr-2 h-4 w-4" /> Reviver Jogador
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Action Dialog */}
      <Dialog open={!!actionType} onOpenChange={(open) => !open && closeAction()}>
        <DialogContent className="glass-panel border-white/10 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl neon-text">Confirmar Ação</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Você está prestes a executar uma ação crítica em <span className="font-bold text-white">{selectedPlayer?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {["PLAYER_LIVES_ADD", "PLAYER_LIVES_SET", "PLAYER_POINTS_ADD"].includes(actionType || "") && (
              <div className="grid gap-2">
                <Label htmlFor="value" className="text-white/80">Valor numérico</Label>
                <Input
                  id="value"
                  type="number"
                  placeholder="Ex: 5"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  className="bg-black/50 border-white/10 focus-visible:ring-purple-500"
                />
              </div>
            )}
            
            {actionType === "PLAYER_ELIMINATE" && (
              <p className="text-red-400 font-medium">Esta ação removerá o jogador da Allowlist e desconectará ele do servidor instantaneamente. Tem certeza?</p>
            )}
            
            {actionType === "PLAYER_REVIVE" && (
              <p className="text-purple-400 font-medium">Esta ação restaurará as vidas do jogador e o adicionará de volta na Allowlist para entrar no servidor.</p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={closeAction} disabled={isSubmitting} className="hover:bg-white/5">
              Cancelar
            </Button>
            <Button 
              onClick={submitAction} 
              disabled={isSubmitting}
              className={actionType === "PLAYER_ELIMINATE" ? "bg-red-600 hover:bg-red-500 text-white" : "bg-purple-600 hover:bg-purple-500 text-white"}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar Execução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
