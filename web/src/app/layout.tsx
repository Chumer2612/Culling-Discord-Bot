import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jogo do Abate | Painel",
  description: "Painel de Controle Oficial do Jogo do Abate",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${outfit.variable} antialiased`}
      >
        {children}
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
