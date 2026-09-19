import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageUploadField } from "@/components/ImageUploadField";
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

export const Route = createFileRoute("/_authenticated/admin/novidades")({
  head: () => ({
    meta: [
      { title: "Novidades e ofertas — Administração Trapiche Pescados" },
      {
        name: "description",
        content: "Publique imagens de ofertas do dia e novidades exibidas para os clientes no catálogo.",
      },
    ],
  }),
  component: AdminBannersPage,
});

type Banner = Tables<"banners">;

const empty = {
  id: "",
  title: "",
  description: "",
  image_url: "",
  link_url: "",
  customer_type: "ambos",
  active: true,
  sort_order: "0",
  starts_at: "",
  ends_at: "",
};
type FormState = typeof empty;

function AdminBannersPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);

  const q = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Banner[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
    qc.invalidateQueries({ queryKey: ["banners"] });
  };

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        title: f.title.trim(),
        description: f.description,
        image_url: f.image_url.trim(),
        link_url: f.link_url.trim(),
        customer_type: f.customer_type === "ambos" ? null : (f.customer_type as "atacado" | "varejo"),
        active: f.active,
        sort_order: Number(f.sort_order) || 0,
        starts_at: f.starts_at || null,
        ends_at: f.ends_at || null,
      };
      if (f.id) {
        const { error } = await supabase.from("banners").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("banners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Novidade salva.");
      setForm(null);
      invalidate();
    },
    onError: () => toast.error("Não foi possível salvar a novidade."),
  });

  const toggleActive = useMutation({
    mutationFn: async (b: Banner) => {
      const { error } = await supabase.from("banners").update({ active: !b.active }).eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error("Não foi possível alterar a novidade."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Novidade removida.");
      invalidate();
    },
    onError: () => toast.error("Não foi possível remover a novidade."),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Novidades e ofertas</h2>
          <p className="text-sm text-muted-foreground">
            Adicione quantas imagens quiser. Elas aparecem em destaque no catálogo do cliente.
          </p>
        </div>
        <Button onClick={() => setForm({ ...empty })}>
          <Plus className="h-4 w-4" /> Nova imagem
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
        {q.isLoading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagem</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Público</TableHead>
                <TableHead>Ativa</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="h-12 w-20 overflow-hidden rounded-lg border bg-secondary">
                      {b.image_url && <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{b.title || "(sem título)"}</div>
                    {b.description && (
                      <div className="max-w-xs truncate text-xs text-muted-foreground">{b.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {b.starts_at || b.ends_at
                      ? `${b.starts_at ? b.starts_at.split("-").reverse().join("/") : "hoje"} → ${
                          b.ends_at ? b.ends_at.split("-").reverse().join("/") : "sem fim"
                        }`
                      : "Sempre"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.customer_type ? "aqua" : "muted"}>
                      {b.customer_type === "atacado"
                        ? "Atacado"
                        : b.customer_type === "varejo"
                          ? "Varejo"
                          : "Atacado e varejo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch checked={b.active} onCheckedChange={() => toggleActive.mutate(b)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="iconSm"
                      aria-label="Editar"
                      onClick={() =>
                        setForm({
                          id: b.id,
                          title: b.title,
                          description: b.description,
                          image_url: b.image_url,
                          link_url: b.link_url,
                          customer_type: b.customer_type ?? "ambos",
                          active: b.active,
                          sort_order: String(b.sort_order),
                          starts_at: b.starts_at ?? "",
                          ends_at: b.ends_at ?? "",
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      aria-label="Remover"
                      onClick={() => {
                        if (confirm("Remover esta novidade?")) remove.mutate(b.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(q.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma novidade publicada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar novidade" : "Nova novidade"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <ImageUploadField
                label="Imagem"
                folder="novidades"
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
                hint="Use imagens largas (ex.: 1200 x 500) para melhor visualização."
              />
              <div className="space-y-2">
                <Label htmlFor="b-title">Título</Label>
                <Input
                  id="b-title"
                  value={form.title}
                  placeholder="Ex.: Oferta do dia — Camarão rosa"
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-desc">Texto</Label>
                <Textarea
                  id="b-desc"
                  value={form.description}
                  placeholder="Ex.: Válido somente hoje, enquanto durar o estoque."
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="b-link">Link (opcional)</Label>
                <Input
                  id="b-link"
                  value={form.link_url}
                  placeholder="https://..."
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="b-start">Mostrar a partir de</Label>
                  <Input
                    id="b-start"
                    type="date"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="b-end">Mostrar até</Label>
                  <Input
                    id="b-end"
                    type="date"
                    value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Quem vê</Label>
                  <Select value={form.customer_type} onValueChange={(v) => setForm({ ...form, customer_type: v })}>
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
                  <Label htmlFor="b-order">Ordem</Label>
                  <Input
                    id="b-order"
                    inputMode="numeric"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="b-active" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label htmlFor="b-active">Visível para os clientes</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button disabled={!form?.image_url.trim() || save.isPending} onClick={() => form && save.mutate(form)}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
