"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Shield, CheckCircle, XCircle, Edit3, Loader2, RefreshCw } from "lucide-react";

export default function RulesPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<"APPROVE" | "DENY" | "ADAPT" | "EDIT" | null>(null);
  const [notes, setNotes] = useState("");
  const [adaptedText, setAdaptedText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/requests");
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const openDialog = (req: any, action: "APPROVE" | "DENY" | "ADAPT" | "EDIT") => {
    setSelectedReq(req);
    setDialogAction(action);
    setNotes(action === "EDIT" ? req.notes : "");
    setAdaptedText(req.adapted_text || req.notes);
    setDialogOpen(true);
  };

  const submitAction = async () => {
    if (!selectedReq || !dialogAction) return;
    setIsSubmitting(true);
    try {
      if (dialogAction === "EDIT") {
        await fetch(`/api/requests/${selectedReq.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: notes })
        });
        toast.success("Texto editado e painéis sincronizados!");
      } else {
        await fetch(`/api/requests/${selectedReq.id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            status: dialogAction, 
            staffNotes: notes, 
            adaptedText: dialogAction === "ADAPT" ? adaptedText : null 
          })
        });
        toast.success(`Pedido ${dialogAction === "APPROVE" ? "Aprovado" : dialogAction === "DENY" ? "Negado" : "Adaptado"}!`);
      }
      setDialogOpen(false);
      fetchRequests();
    } catch (err) {
      toast.error("Erro na operação");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Regras</h2>
          <p className="text-muted-foreground mt-2">Julgue as condições de vitória e regras propostas pelos jogadores.</p>
        </div>
        <Button variant="outline" onClick={() => { setLoading(true); fetchRequests(); }} className="border-white/10">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="rounded-xl border border-white/5 bg-black/40 backdrop-blur-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead>Tipo</TableHead>
              <TableHead>Jogador</TableHead>
              <TableHead>Texto Proposto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-500" />
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum pedido encontrado.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => (
                <TableRow key={req.id} className="border-white/5 hover:bg-white/5">
                  <TableCell>
                    <Badge variant="outline" className={req.request_type === 'RULE' ? 'border-blue-500/30 text-blue-400' : 'border-orange-500/30 text-orange-400'}>
                      {req.request_type === 'RULE' ? 'Regra' : 'Condição de Vitória'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-white">{req.player_name}</TableCell>
                  <TableCell className="max-w-md truncate" title={req.notes}>
                    {req.adapted_text || req.notes}
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      req.status === 'APPROVED' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' :
                      req.status === 'DENIED' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' :
                      req.status === 'ADAPTED' ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' :
                      'bg-white/10 text-white hover:bg-white/20'
                    }>
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {req.status === 'PENDING' ? (
                      <>
                        <Button size="sm" variant="ghost" className="h-8 text-green-400 hover:text-green-300 hover:bg-green-400/10" onClick={() => openDialog(req, "APPROVE")}>
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10" onClick={() => openDialog(req, "ADAPT")}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => openDialog(req, "DENY")}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" className="h-8 border-white/10" onClick={() => openDialog(req, "EDIT")}>
                        <Edit3 className="w-4 h-4 mr-2" /> Editar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "APPROVE" && "Aprovar Pedido"}
              {dialogAction === "DENY" && "Negar Pedido"}
              {dialogAction === "ADAPT" && "Adaptar Pedido"}
              {dialogAction === "EDIT" && "Editar Texto"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {dialogAction === "APPROVE" && "Isso publicará a regra oficialmente no Discord."}
              {dialogAction === "DENY" && "O jogador receberá os pontos de volta se houver custo."}
              {dialogAction === "ADAPT" && "Reescreva a regra para equilibrá-la antes de aprovar."}
              {dialogAction === "EDIT" && "Altere o texto atual. Isso atualizará o Discord imediatamente."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {(dialogAction === "ADAPT" || dialogAction === "EDIT") && (
              <div className="space-y-2">
                <Label>Texto Oficial (Sincronizado no Discord)</Label>
                <Textarea 
                  className="bg-black/50 border-white/10 min-h-[100px]"
                  value={dialogAction === "EDIT" ? notes : adaptedText}
                  onChange={(e) => dialogAction === "EDIT" ? setNotes(e.target.value) : setAdaptedText(e.target.value)}
                />
              </div>
            )}
            
            {(dialogAction !== "EDIT") && (
              <div className="space-y-2">
                <Label>Anotação da Staff (Mensagem Privada pro Jogador)</Label>
                <Input 
                  className="bg-black/50 border-white/10"
                  placeholder="Motivo da decisão..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button 
              disabled={isSubmitting}
              className={
                dialogAction === "APPROVE" ? "bg-green-600 hover:bg-green-700 text-white" :
                dialogAction === "DENY" ? "bg-red-600 hover:bg-red-700 text-white" :
                "bg-purple-600 hover:bg-purple-700 text-white"
              } 
              onClick={submitAction}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
