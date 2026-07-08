"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

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

  useEffect(() => {
    fetch("/api/players")
      .then((res) => res.json())
      .then((data) => {
        setPlayers(data);
        setLoading(false);
      });
  }, []);

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
              <TableHead className="text-right pr-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : players.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
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
                  <TableCell className="text-right pr-6">
                    {player.eliminated ? (
                      <Badge variant="destructive" className="bg-red-500/20 text-red-400 hover:bg-red-500/30">Eliminado</Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-500/20 text-green-400 hover:bg-green-500/30">Vivo</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
