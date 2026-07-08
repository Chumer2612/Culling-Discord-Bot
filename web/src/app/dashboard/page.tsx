"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Skull, Flame, Trophy, Loader2, Activity, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then(res => res.json()),
      fetch("/api/stats/activities").then(res => res.json())
    ]).then(([statsData, activitiesData]) => {
      setStats(statsData);
      setActivities(Array.isArray(activitiesData) ? activitiesData : []);
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
      </div>
    );
  }

  const mortalityRate = stats?.totalPlayers > 0 
    ? Math.round((stats.eliminated / stats.totalPlayers) * 100) 
    : 0;

  const activeSurvivors = (stats?.totalPlayers || 0) - (stats?.eliminated || 0);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Visão Geral</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Jogadores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPlayers || 0}</div>
            <p className="text-xs text-muted-foreground">Cadastrados no Servidor</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eliminados</CardTitle>
            <Skull className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats?.eliminated || 0}</div>
            <p className="text-xs text-muted-foreground">{mortalityRate}% de mortalidade</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maior Fama</CardTitle>
            <Flame className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{stats?.highestFame?.fame || 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.highestFame?.name || "Nenhum"}</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sobreviventes Ativos</CardTitle>
            <Trophy className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{activeSurvivors}</div>
            <p className="text-xs text-muted-foreground">Em combate ativo</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 glass-panel h-96 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-yellow-400" />
              Pedidos Pendentes ({stats?.pendingRequests || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            {stats?.pendingRequests > 0 ? (
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-yellow-400">{stats?.pendingRequests}</div>
                <p className="text-muted-foreground">Vá até a aba de Regras para julgar os pedidos da comunidade.</p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <CheckCircle2 className="w-16 h-16 text-green-500/50 mx-auto" />
                <p className="text-muted-foreground">Nenhum pedido de vitória/regra pendente.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3 glass-panel h-96 flex flex-col overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5 text-purple-400" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            <div className="divide-y divide-white/5">
              {activities.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Sem atividades recentes.</div>
              ) : (
                activities.map((act) => (
                  <div key={act.id + act.type} className="flex items-start gap-4 p-4 hover:bg-white/5 transition-colors">
                    {act.type === 'kill' ? (
                      <div className="bg-red-500/10 p-2 rounded-full border border-red-500/20 shrink-0">
                        <Skull className="w-4 h-4 text-red-400" />
                      </div>
                    ) : (
                      <div className="bg-blue-500/10 p-2 rounded-full border border-blue-500/20 shrink-0">
                        <ShieldAlert className="w-4 h-4 text-blue-400" />
                      </div>
                    )}
                    <div className="flex-1 space-y-1 overflow-hidden">
                      {act.type === 'kill' ? (
                        <p className="text-sm font-medium leading-none truncate">
                          <span className="text-orange-400">{act.killer_name}</span> abateu <span className="text-red-400">{act.victim_name}</span>
                        </p>
                      ) : (
                        <p className="text-sm font-medium leading-none truncate">
                          <span className="text-blue-400">{act.discord_name}</span> rodou <code className="text-xs bg-black/40 px-1 py-0.5 rounded">{act.minecraft_command}</code>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(act.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
