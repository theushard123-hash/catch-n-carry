import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CUSTOMER_TYPE_LABEL, formatDate, formatDocument } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Administração Trapiche Pescados" },
      { name: "description", content: "Aprove cadastros, defina o tipo de cliente e o código no CIGAM." },
    ],
  }),
  component: AdminCustomersPage,
});

type Profile = Tables<"profiles">;

function AdminCustomersPage() {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState("todos");
  const [edit, setEdit] = useState<Profile | null>(null);

  const q = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const approve = useMutation({
    mutationFn: async (p: Profile) => {
      const { error } = await supabase.from("profiles").update({ approved: !p.approved }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cadastro atualizado.");
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: () => toast.error("Não foi possível atualizar o cadastro."),
  });

  const save = useMutation({
    mutationFn: async (p: Profile) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          customer_type: p.customer_type,
          external_code: p.external_code,
          admin_notes: p.admin_notes,
          approved: p.approved,
        })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente salvo.");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
    },
    onError: () => toast.error("Não foi possível salvar o cliente."),
  });

  // Varejo não passa por análise: apenas atacado pode ficar pendente.
  const isPending = (p: Profile) => p.customer_type === "atacado" && !p.approved;

  const rows = (q.data ?? []).filter((p) => {
    if (filter === "pendentes" && !isPending(p)) return false;
    if (filter === "aprovados" && isPending(p)) return false;
    if (filter === "atacado" && p.customer_type !== "atacado") return false;
    if (filter === "varejo" && p.customer_type !== "varejo") return false;

    if (!term.trim()) return true;
    const t = term.toLowerCase();
    return [p.full_name, p.company_name, p.email ?? "", p.document, p.city].some((v) =>
      String(v).toLowerCase().includes(t),
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Clientes</h2>
        <p className="text-sm text-muted-foreground">
          Aprove novos cadastros e vincule o código do cliente no CIGAM.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar por nome, empresa, e-mail ou documento"
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendentes">Aguardando aprovação</SelectItem>
            <SelectItem value="aprovados">Aprovados</SelectItem>
            <SelectItem value="atacado">Atacado</SelectItem>
            <SelectItem value="varejo">Varejo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
        {q.isLoading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Cód. CIGAM</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.company_name || p.full_name || "Sem nome"}</div>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.customer_type === "atacado" ? "aqua" : "muted"}>
                      {CUSTOMER_TYPE_LABEL[p.customer_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDocument(p.document)}</TableCell>
                  <TableCell>{p.external_code || "—"}</TableCell>
                  <TableCell>{formatDate(p.created_at)}</TableCell>
                  <TableCell>
                    {p.approved ? (
                      <Badge variant="success">Aprovado</Badge>
                    ) : (
                      <Badge variant="warning">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {!p.approved && (
                        <Button variant="outline" size="sm" onClick={() => approve.mutate(p)}>
                          <Check className="h-4 w-4" /> Aprovar
                        </Button>
                      )}
                      <Button variant="ghost" size="iconSm" aria-label="Editar" onClick={() => setEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.company_name || edit?.full_name || "Cliente"}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de cliente</Label>
                <Select
                  value={edit.customer_type}
                  onValueChange={(v) => setEdit({ ...edit, customer_type: v as Profile["customer_type"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atacado">Atacado</SelectItem>
                    <SelectItem value="varejo">Varejo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cl-code">Código no CIGAM</Label>
                <Input
                  id="cl-code"
                  value={edit.external_code ?? ""}
                  onChange={(e) => setEdit({ ...edit, external_code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cl-notes">Observações internas</Label>
                <Textarea
                  id="cl-notes"
                  value={edit.admin_notes ?? ""}
                  onChange={(e) => setEdit({ ...edit, admin_notes: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="cl-approved"
                  checked={edit.approved}
                  onCheckedChange={(v) => setEdit({ ...edit, approved: v })}
                />
                <Label htmlFor="cl-approved">Cadastro aprovado para pedidos</Label>
              </div>
              <div className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
                {edit.phone && <div>Telefone: {edit.phone}</div>}
                {edit.address && (
                  <div>
                    Endereço: {edit.address}
                    {edit.city ? `, ${edit.city}` : ""}
                    {edit.state ? ` - ${edit.state}` : ""}
                    {edit.zip ? ` · ${edit.zip}` : ""}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit(null)}>
              Cancelar
            </Button>
            <Button disabled={save.isPending} onClick={() => edit && save.mutate(edit)}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
