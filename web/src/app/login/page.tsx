"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Gamepad2, Shield } from "lucide-react";

export default function LoginPage() {
  const handleLogin = () => {
    // Redireciona para o proxy interno do Next.js (que joga pra API)
    // Funciona independente se é localhost ou IP da VPS
    window.location.href = "/api/auth/discord/login";
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <Card className="glass-panel border-purple-500/20">
          <CardHeader className="text-center space-y-4 pt-8">
            <div className="mx-auto bg-purple-500/10 w-20 h-20 rounded-2xl flex items-center justify-center border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
              <Shield className="w-10 h-10 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold tracking-tight neon-text">Kogane Admin</CardTitle>
              <CardDescription className="text-muted-foreground/80 mt-2 text-base">
                Acesso restrito ao controle do Jogo do Abate
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pb-8 px-8">
            <Button
              onClick={handleLogin}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] h-12 text-md font-medium"
            >
              <Gamepad2 className="mr-2 w-5 h-5" />
              Autenticar com Discord
            </Button>
            <p className="text-xs text-center text-muted-foreground/50 mt-6">
              Apenas membros da equipe Staff possuem acesso ao painel.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
