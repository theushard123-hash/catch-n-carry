import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

export const Route = createFileRoute("/_authenticated/admin/condicoes")({
  head: () => ({
    meta: [
      { title: "Condições de pagamento — Administração Trapiche Pescados" },
      { name: "description", content: "Defina as condições de pagamento disponíveis para atacado e varejo." },
    ],
  }),
  component: AdminConditionsPage,
});

type Condition = Tables<"payment_conditions">;

const empty = {
  id: "",
  name: "",
  description: "",
  customer_type: "ambos",
  active: true,
  sort_order: "0",
};
type FormState = typeof empty;

function AdminConditionsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);

  const q = useQuery({
    queryKey: ["admin-conditions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_conditions")
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as Condition[];
    },
  });

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        name: f.name.trim(),
        description: f.description,
        customer_type: f.customer_type === "ambos" ? null : (f.customer_type as "atacado" | "varejo"),
        active: f.active,
        sort_order: Number(f.sort_order) || 0,
      };
      if (f.id) {
        const { error } = await supabase.from("payment_conditions").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payment_conditions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Condição salva.");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["admin-conditions"] });
      qc.invalidateQueries({ queryKey: ["payment-conditions"] });
    },
    onError: () => toast.error("Não foi possível salvar a condição."),
  });

  const toggleActive = useMutation({
    mutationFn: async (c: Condition) => {
      const { error } = await supabase.from("payment_conditions").update({ active: !c.active }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-conditions"] }),
    onError: () => toast.error("Não foi possível alterar a condição."),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Condições de pagamento</h2>
          <p className="text-sm text-muted-foreground">
            Escolha se cada condição vale para atacado, varejo ou os dois.
          </p>
        </div>
        <Button onClick={() => setForm({ ...empty })}>
          <Plus className="h-4 w-4" /> Nova condição
        </Button>
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
                <TableHead>Condição</TableHead>
                <TableHead>Vale para</TableHead>
                <TableHead>Ativa</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium">{c.name}</div>
                    {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.customer_type ? "aqua" : "muted"}>
                      {c.customer_type === "atacado"
                        ? "Atacado"
                        : c.customer_type === "varejo"
                          ? "Varejo"
                          : "Atacado e varejo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch checked={c.active} onCheckedChange={() => toggleActive.mutate(c)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="iconSm"
                      aria-label="Editar"
                      onClick={() =>
                        setForm({
                          id: c.id,
                          name: c.name,
                          description: c.description,
                          customer_type: c.customer_type ?? "ambos",
                          active: c.active,
                          sort_order: String(c.sort_order),
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(q.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma condição cadastrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar condição" : "Nova condição"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="c-name">Nome</Label>
                <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-desc">Descrição</Label>
                <Textarea
                  id="c-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Vale para</Label>
                <Select
                  value={form.customer_type}
                  onValueChange={(v) => setForm({ ...form, customer_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ambos">Atacado e varejo</SelectItem>
                    <SelectItem value="atacado">Somente atacado</SelectItem>
                    <SelectItem value="varejo">Somente varejo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-order">Ordem</Label>
                <Input
                  id="c-order"
                  inputMode="numeric"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch id="c-active" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label htmlFor="c-active">Disponível para os clientes</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button disabled={!form?.name.trim() || save.isPending} onClick={() => form && save.mutate(form)}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
