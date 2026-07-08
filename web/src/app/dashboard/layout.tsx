"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, LogOut, Loader2, Gamepad2, Shield, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ discordId: string; username: string; avatar: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className="w-64 glass-panel border-r border-white/10 flex flex-col z-20"
      >
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <Gamepad2 className="w-6 h-6 text-purple-400 mr-2" />
          <span className="font-bold text-lg neon-text">Jogo do Abate</span>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <Link href="/dashboard">
            <Button variant={pathname === "/dashboard" ? "secondary" : "ghost"} className="w-full justify-start">
              <LayoutDashboard className="mr-2 w-4 h-4" />
              Visão Geral
            </Button>
          </Link>
          <Link href="/dashboard/players">
            <Button variant={pathname === "/dashboard/players" ? "secondary" : "ghost"} className="w-full justify-start">
              <Users className="mr-2 w-4 h-4" />
              Jogadores
            </Button>
          </Link>
          <Link href="/dashboard/rules">
            <Button variant={pathname === "/dashboard/rules" ? "secondary" : "ghost"} className="w-full justify-start">
              <Shield className="mr-2 w-4 h-4" />
              Regras e Condições
            </Button>
          </Link>
          <Link href="/dashboard/chat">
            <Button variant={pathname === "/dashboard/chat" ? "secondary" : "ghost"} className="w-full justify-start">
              <MessageSquare className="mr-2 w-4 h-4" />
              Chat do Bot
            </Button>
          </Link>
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <Avatar>
              <AvatarImage src={`https://cdn.discordapp.com/avatars/${user?.discordId}/${user?.avatar}.png`} />
              <AvatarFallback>{user?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.username}</span>
              <span className="text-xs text-muted-foreground">Staff</span>
            </div>
          </div>
          <Button variant="destructive" className="w-full bg-destructive/20 text-red-400 hover:bg-destructive/40" onClick={() => {
            fetch('/api/auth/logout', { method: 'POST' }).then(() => router.push('/login'));
          }}>
            <LogOut className="mr-2 w-4 h-4" />
            Sair
          </Button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 glass-panel border-b border-white/5 flex items-center px-8 justify-between sticky top-0 z-10">
          <h1 className="text-xl font-semibold opacity-90">Painel de Controle</h1>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
