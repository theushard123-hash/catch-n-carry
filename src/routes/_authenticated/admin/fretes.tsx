import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/fretes")({
  head: () => ({
    meta: [
      { title: "Fretes — Administração Trapiche Pescados" },
      { name: "description", content: "Configure o valor do frete por bairro e cidade." },
    ],
  }),
  component: FretesPage,
});

function FretesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [nw, setNw] = useState({ city: "Curitiba", neighborhood: "", fee: "" });
  const q = useQuery({
    queryKey: ["admin-shipping"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipping_rates").select("*").order("city").order("fee").order("neighborhood");
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-shipping"] });
    qc.invalidateQueries({ queryKey: ["shipping-rates"] });
  };
  const update = useMutation({
    mutationFn: async (v: { id: string; patch: { fee?: number; active?: boolean } }) => {
      const { error } = await supabase.from("shipping_rates").update(v.patch).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Frete atualizado"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipping_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const add = useMutation({
    mutationFn: async () => {
      const fee = Number(nw.fee.replace(",", "."));
      if (!nw.city.trim() || !(fee >= 0) || nw.fee === "") throw new Error("Informe cidade e valor.");
      const { error } = await supabase.from("shipping_rates").insert({ city: nw.city.trim(), neighborhood: nw.neighborhood.trim(), fee });
      if (error) throw error;
    },
    onSuccess: () => { setNw({ city: nw.city, neighborhood: "", fee: "" }); toast.success("Frete adicionado"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (q.data ?? []).filter((r) => `${r.city} ${r.neighborhood}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Fretes por bairro</h2>
        <p className="text-sm text-muted-foreground">
          O frete é calculado pelo bairro e cidade do endereço de entrega. Bairro em branco vale para o resto da cidade.
          Cidades não listadas aparecem como "a consultar com o vendedor".
        </p>
      </div>
      <div className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-[1fr_1fr_120px_auto]">
        <Input placeholder="Cidade" value={nw.city} onChange={(e) => setNw({ ...nw, city: e.target.value })} />
        <Input placeholder="Bairro (vazio = toda a cidade)" value={nw.neighborhood} onChange={(e) => setNw({ ...nw, neighborhood: e.target.value })} />
        <Input placeholder="R$" inputMode="decimal" value={nw.fee} onChange={(e) => setNw({ ...nw, fee: e.target.value })} />
        <Button onClick={() => add.mutate()} disabled={add.isPending}><Plus /> Adicionar</Button>
      </div>
      <Input placeholder="Buscar bairro ou cidade..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cidade</TableHead>
              <TableHead>Bairro</TableHead>
              <TableHead className="w-32">Frete (R$)</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.city}</TableCell>
                <TableCell>{r.neighborhood || <span className="text-muted-foreground">Demais bairros</span>}</TableCell>
                <TableCell>
                  <Input
                    defaultValue={String(r.fee)}
                    inputMode="decimal"
                    className="h-8"
                    onBlur={(e) => {
                      const fee = Number(e.target.value.replace(",", "."));
                      if (fee >= 0 && fee !== Number(r.fee)) update.mutate({ id: r.id, patch: { fee } });
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Switch checked={r.active} onCheckedChange={(v) => update.mutate({ id: r.id, patch: { active: v } })} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" aria-label="Remover" onClick={() => remove.mutate(r.id)}>
                    <Trash2 className="text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
