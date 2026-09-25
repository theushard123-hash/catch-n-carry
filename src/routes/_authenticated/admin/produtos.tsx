import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageUploadField } from "@/components/ImageUploadField";
import { formatBRL } from "@/lib/format";
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

export const Route = createFileRoute("/_authenticated/admin/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos — Administração Trapiche Pescados" },
      { name: "description", content: "Cadastre e edite produtos, preços de atacado e varejo e categorias." },
    ],
  }),
  component: AdminProductsPage,
});

type Product = Tables<"products">;
type Category = Tables<"categories">;

const empty = {
  id: "",
  sku: "",
  name: "",
  description: "",
  category_id: "",
  unit: "kg",
  price_atacado: "0",
  price_varejo: "0",
  min_qty: "1",
  step_qty: "1",
  image_url: "",
  active: true,
  variable_weight: false,
  sort_order: "0",
};
type FormState = typeof empty;

function AdminProductsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [newCategory, setNewCategory] = useState("");

  const productsQ = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const categoriesQ = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order").order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        sku: f.sku.trim() || null,
        name: f.name.trim(),
        description: f.description,
        category_id: f.category_id || null,
        unit: f.unit,
        price_atacado: Number(f.price_atacado.replace(",", ".")) || 0,
        price_varejo: Number(f.price_varejo.replace(",", ".")) || 0,
        min_qty: Number(f.min_qty.replace(",", ".")) || 1,
        step_qty: Number(f.step_qty.replace(",", ".")) || 1,
        image_url: f.image_url.trim() || null,
        active: f.active,
        variable_weight: f.variable_weight,
        sort_order: Number(f.sort_order) || 0,
      };
      if (f.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Produto salvo.");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: () => toast.error("Não foi possível salvar o produto."),
  });

  const toggleActive = useMutation({
    mutationFn: async (p: Product) => {
      const { error } = await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
    onError: () => toast.error("Não foi possível alterar o produto."),
  });

  const addCategory = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("categories").insert({ name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria criada.");
      setNewCategory("");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: () => toast.error("Não foi possível criar a categoria."),
  });

  const catName = (id: string | null) => categoriesQ.data?.find((c) => c.id === id)?.name ?? "—";

  function openEdit(p: Product) {
    setForm({
      id: p.id,
      sku: p.sku ?? "",
      name: p.name,
      description: p.description,
      category_id: p.category_id ?? "",
      unit: p.unit,
      price_atacado: String(p.price_atacado),
      price_varejo: String(p.price_varejo),
      min_qty: String(p.min_qty),
      step_qty: String(p.step_qty),
      image_url: p.image_url ?? "",
      active: p.active,
      variable_weight: p.variable_weight,
      sort_order: String(p.sort_order),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Produtos</h2>
          <p className="text-sm text-muted-foreground">Preços separados para atacado e varejo.</p>
        </div>
        <Button onClick={() => setForm({ ...empty })}>
          <Plus className="h-4 w-4" /> Novo produto
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-soft">
        <Label className="text-sm">Nova categoria</Label>
        <div className="mt-2 flex gap-2">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Ex.: Frutos do Mar"
            className="max-w-xs"
          />
          <Button
            variant="outline"
            disabled={!newCategory.trim() || addCategory.isPending}
            onClick={() => addCategory.mutate(newCategory)}
          >
            Adicionar
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
        {productsQ.isLoading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Un.</TableHead>
                <TableHead className="text-right">Atacado</TableHead>
                <TableHead className="text-right">Varejo</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(productsQ.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {p.sku && <div className="text-xs text-muted-foreground">{p.sku}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="muted">{catName(p.category_id)}</Badge>
                  </TableCell>
                  <TableCell>{p.unit}</TableCell>
                  <TableCell className="text-right">{formatBRL(p.price_atacado)}</TableCell>
                  <TableCell className="text-right">{formatBRL(p.price_varejo)}</TableCell>
                  <TableCell>
                    <Switch checked={p.active} onCheckedChange={() => toggleActive.mutate(p)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="iconSm" onClick={() => openEdit(p)} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(productsQ.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum produto cadastrado ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="p-name">Nome</Label>
                <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-sku">Código (SKU)</Label>
                <Input id="p-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={form.category_id || "none"}
                  onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {(categoriesQ.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="p-desc">Descrição</Label>
                <Textarea
                  id="p-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-unit">Unidade</Label>
                <Input id="p-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-order">Ordem</Label>
                <Input
                  id="p-order"
                  inputMode="numeric"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-pa">Preço atacado (R$)</Label>
                <Input
                  id="p-pa"
                  inputMode="decimal"
                  value={form.price_atacado}
                  onChange={(e) => setForm({ ...form, price_atacado: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-pv">Preço varejo (R$)</Label>
                <Input
                  id="p-pv"
                  inputMode="decimal"
                  value={form.price_varejo}
                  onChange={(e) => setForm({ ...form, price_varejo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-min">Quantidade mínima</Label>
                <Input
                  id="p-min"
                  inputMode="decimal"
                  value={form.min_qty}
                  onChange={(e) => setForm({ ...form, min_qty: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-step">Incremento</Label>
                <Input
                  id="p-step"
                  inputMode="decimal"
                  value={form.step_qty}
                  onChange={(e) => setForm({ ...form, step_qty: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <ImageUploadField
                  label="Foto do produto"
                  folder="produtos"
                  value={form.image_url}
                  onChange={(url) => setForm({ ...form, image_url: url })}
                  hint="A foto aparece no catálogo dos clientes."
                />
              </div>
              <div className="flex items-start gap-3 rounded-xl border p-3 sm:col-span-2">
                <Switch
                  id="p-vw"
                  checked={form.variable_weight}
                  onCheckedChange={(v) => setForm({ ...form, variable_weight: v })}
                />
                <div>
                  <Label htmlFor="p-vw">Peso variado</Label>
                  <p className="text-xs text-muted-foreground">
                    Quando ligado, o cliente escolhe a gramatura e o tipo de corte ao adicionar.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch
                  id="p-active"
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                />
                <Label htmlFor="p-active">Disponível para pedidos</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!form?.name.trim() || save.isPending}
              onClick={() => form && save.mutate(form)}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
