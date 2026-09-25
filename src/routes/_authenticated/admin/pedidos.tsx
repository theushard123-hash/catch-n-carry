import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchOrdersWithCustomers, customerLabel, downloadCsv, type OrderWithCustomer } from "@/lib/admin-queries";
import { formatBRL, formatDate, formatQty, ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos — Administração Trapiche Pescados" },
      { name: "description", content: "Aprove, fature e exporte os pedidos recebidos pelo portal." },
    ],
  }),
  component: AdminOrdersPage,
});

const STATUSES = ["pendente", "aprovado", "faturado", "cancelado"] as const;

function AdminOrdersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("todos");
  const [selected, setSelected] = useState<OrderWithCustomer | null>(null);

  const q = useQuery({ queryKey: ["admin-orders"], queryFn: () => fetchOrdersWithCustomers() });

  const itemsQ = useQuery({
    queryKey: ["admin-order-items", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase.from("order_items").select("*").eq("order_id", selected!.id);
      if (error) throw error;
      return data as Tables<"order_items">[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Tables<"orders">["status"] }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setSelected(null);
    },
    onError: () => toast.error("Não foi possível atualizar o status."),
  });

  const orders = (q.data ?? []).filter((o) => filter === "todos" || o.status === filter);

  function exportCsv() {
    const rows: (string | number)[][] = [
      ["Pedido", "Data", "Cliente", "Documento", "Tipo", "Pagamento", "Status", "Total"],
      ...orders.map((o) => [
        String(o.order_number),
        formatDate(o.created_at, true),
        customerLabel(o.customer),
        o.customer?.document ?? "",
        o.customer_type,
        o.payment_condition_name,
        ORDER_STATUS_LABEL[o.status] ?? o.status,
        Number(o.total),
      ]),
    ];
    downloadCsv(`pedidos-trapiche-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success("Planilha exportada. Importe no CIGAM para faturar.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCsv} disabled={!orders.length}>
          <Download /> Exportar planilha (CIGAM)
        </Button>
      </div>

      {q.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : !orders.length ? (
        <div className="rounded-2xl border border-dashed bg-card p-12 text-center text-muted-foreground">
          Nenhum pedido {filter !== "todos" ? "com este status" : "recebido ainda"}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-semibold">#{String(o.order_number).padStart(4, "0")}</TableCell>
                  <TableCell>{formatDate(o.created_at, true)}</TableCell>
                  <TableCell>{customerLabel(o.customer)}</TableCell>
                  <TableCell>{o.payment_condition_name}</TableCell>
                  <TableCell className="text-right font-semibold">{formatBRL(o.total)}</TableCell>
                  <TableCell>
                    <Badge variant={ORDER_STATUS_VARIANT[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(o)}>
                      <Eye /> Abrir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Pedido #{String(selected.order_number).padStart(4, "0")} — {customerLabel(selected.customer)}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Pagamento: </span>
                  {selected.payment_condition_name}
                </p>
                <p>
                  <span className="text-muted-foreground">Entrega: </span>
                  {selected.delivery_date ? formatDate(selected.delivery_date + "T12:00:00") : "A combinar"}
                </p>
                <p>
                  <span className="text-muted-foreground">Telefone: </span>
                  {selected.customer?.phone ?? "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Documento: </span>
                  {selected.customer?.document ?? "—"}
                </p>
                {selected.delivery_address && (
                  <p className="whitespace-pre-wrap sm:col-span-2">Entrega em: {selected.delivery_address}</p>
                )}
                {selected.notes && <p className="sm:col-span-2 whitespace-pre-wrap">Obs: {selected.notes}</p>}
              </div>
              <div className="overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(itemsQ.data ?? []).map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>
                          {i.product_name}
                          {i.sku && <span className="ml-2 text-xs text-muted-foreground">{i.sku}</span>}
                        </TableCell>
                        <TableCell className="text-right">{formatQty(i.qty, i.unit)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatBRL(i.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
          <p className="mb-2 text-right text-sm text-muted-foreground">Frete: {selected.shipping_fee == null ? "a consultar com o vendedor" : formatBRL(selected.shipping_fee)}</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-primary">{formatBRL(selected.total)}</span>
                <div className="flex gap-2">
                  {selected.status === "pendente" && (
                    <>
                      <Button variant="success" onClick={() => setStatus.mutate({ id: selected.id, status: "aprovado" })}>
                        Aprovar
                      </Button>
                      <Button variant="outline" onClick={() => setStatus.mutate({ id: selected.id, status: "cancelado" })}>
                        Cancelar
                      </Button>
                    </>
                  )}
                  {selected.status === "aprovado" && (
                    <Button variant="success" onClick={() => setStatus.mutate({ id: selected.id, status: "faturado" })}>
                      Marcar como faturado
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
