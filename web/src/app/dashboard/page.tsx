import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Skull, Flame, Trophy } from "lucide-react";

export default function DashboardPage() {
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
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-muted-foreground">+4 desde ontem</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eliminados</CardTitle>
            <Skull className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">23</div>
            <p className="text-xs text-muted-foreground">16% de mortalidade</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maior Fama</CardTitle>
            <Flame className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">12,450</div>
            <p className="text-xs text-muted-foreground">Chumer_</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sobreviventes Ativos</CardTitle>
            <Trophy className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">119</div>
            <p className="text-xs text-muted-foreground">Em combate ativo</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Aqui virão os gráficos futuros */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 glass-panel h-96 flex items-center justify-center">
          <p className="text-muted-foreground">Gráfico de Fama (Em breve)</p>
        </Card>
        <Card className="col-span-3 glass-panel h-96 flex items-center justify-center">
          <p className="text-muted-foreground">Atividade Recente (Em breve)</p>
        </Card>
      </div>
    </div>
  );
}
