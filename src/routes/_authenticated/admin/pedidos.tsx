import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Download, MessageCircle, Printer, ArrowRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchOrdersWithCustomers, customerLabel, downloadCsv, type OrderWithCustomer } from "@/lib/admin-queries";
import { formatBRL, formatDate, formatQty, ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos em tempo real — Administração Trapiche Pescados" },
      { name: "description", content: "Acompanhe, separe, imprima e conclua os pedidos recebidos em tempo real." },
      { property: "og:title", content: "Pedidos em tempo real — Administração Trapiche Pescados" },
      { property: "og:description", content: "Acompanhe, separe, imprima e conclua os pedidos recebidos em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminOrdersPage,
});

type Status = Tables<"orders">["status"];
type Item = Tables<"order_items">;

const NEXT: Partial<Record<Status, { to: Status; label: string }>> = {
  pendente: { to: "em_separacao", label: "Iniciar separação" },
  aprovado: { to: "em_separacao", label: "Iniciar separação" },
  em_separacao: { to: "pronto_envio", label: "Pronto para envio" },
  pronto_envio: { to: "faturado", label: "Concluir" },
};

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "novos", label: "Apenas Novos" },
  { id: "andamento", label: "Em andamento" },
  { id: "concluidos", label: "Concluídos" },
] as const;

function matches(filter: string, s: Status) {
  if (filter === "novos") return s === "pendente";
  if (filter === "andamento") return s === "aprovado" || s === "em_separacao" || s === "pronto_envio";
  if (filter === "concluidos") return s === "faturado";
  return true;
}

function playBell(ctx: AudioContext) {
  const t = ctx.currentTime;
  [880, 1320, 880, 1320].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = f;
    const s = t + i * 0.18;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(0.4, s + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.16);
    o.connect(g).connect(ctx.destination);
    o.start(s);
    o.stop(s + 0.17);
  });
}

function waLink(phone?: string | null) {
  let d = (phone ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (!d.startsWith("55")) d = "55" + d;
  return `https://wa.me/${d}`;
}

const num = (n: number | string) => "#" + String(n).padStart(4, "0");

function AdminOrdersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("todos");
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  const q = useQuery({ queryKey: ["admin-orders"], queryFn: () => fetchOrdersWithCustomers() });
  const ids = (q.data ?? []).map((o) => o.id);
  const itemsQ = useQuery({
    queryKey: ["admin-orders-items", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("order_items").select("*").in("order_id", ids);
      if (error) throw error;
      const m = new Map<string, Item[]>();
      for (const i of data ?? []) m.set(i.order_id, [...(m.get(i.order_id) ?? []), i]);
      return m;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const o = payload.new as Tables<"orders">;
          toast.success(`Novo pedido ${num(o.order_number)} — ${formatBRL(o.total)}`);
          setFresh((s) => new Set(s).add(o.id));
          if (soundRef.current && audioRef.current) playBell(audioRef.current);
          // itens são inseridos logo após o pedido
          setTimeout(() => qc.invalidateQueries({ queryKey: ["admin-orders-items"] }), 1500);
        }
        qc.invalidateQueries({ queryKey: ["admin-orders"] });
        qc.invalidateQueries({ queryKey: ["admin-stats"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  function toggleSound() {
    if (soundOn) {
      setSoundOn(false);
      soundRef.current = false;
      return;
    }
    const ctx = audioRef.current ?? new AudioContext();
    audioRef.current = ctx;
    void ctx.resume().then(() => playBell(ctx));
    setSoundOn(true);
    soundRef.current = true;
    toast.success("Alerta sonoro ativado.");
  }

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(`Status: ${ORDER_STATUS_LABEL[v.status]}`);
      setFresh((s) => {
        const n = new Set(s);
        n.delete(v.id);
        return n;
      });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: () => toast.error("Não foi possível atualizar o status."),
  });

  const all = q.data ?? [];
  const orders = all.filter((o) => matches(filter, o.status));
  const newCount = all.filter((o) => o.status === "pendente").length;

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
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl border bg-card p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {f.label}
              {f.id === "novos" && newCount > 0 && ` (${newCount})`}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> Ao vivo
          </span>
          <Button variant={soundOn ? "default" : "outline"} onClick={toggleSound}>
            {soundOn ? <Bell /> : <BellOff />} {soundOn ? "Som ativado" : "Ativar som de alerta"}
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={!orders.length}>
            <Download /> CSV (CIGAM)
          </Button>
        </div>
      </div>

      {q.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : !orders.length ? (
        <div className="rounded-2xl border border-dashed bg-card p-12 text-center text-muted-foreground">
          Nenhum pedido neste filtro.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              items={itemsQ.data?.get(o.id) ?? []}
              isFresh={fresh.has(o.id)}
              busy={setStatus.isPending}
              onStatus={(status) => setStatus.mutate({ id: o.id, status })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order: o,
  items,
  isFresh,
  busy,
  onStatus,
}: {
  order: OrderWithCustomer;
  items: Item[];
  isFresh: boolean;
  busy: boolean;
  onStatus: (s: Status) => void;
}) {
  const next = NEXT[o.status];
  const wa = waLink(o.customer?.phone);
  return (
    <div
      className={`flex flex-col rounded-2xl border bg-card p-4 shadow-soft ${
        isFresh ? "ring-2 ring-primary animate-fade-up" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold">{num(o.order_number)}</p>
          <p className="text-xs text-muted-foreground">{formatDate(o.created_at, true)}</p>
        </div>
        <Badge variant={ORDER_STATUS_VARIANT[o.status]}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</Badge>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{customerLabel(o.customer)}</p>
          <p className="text-sm text-muted-foreground">{o.customer?.phone || "Sem telefone"}</p>
        </div>
        {wa && (
          <Button asChild size="sm" variant="success">
            <a href={wa} target="_blank" rel="noopener noreferrer">
              <MessageCircle /> WhatsApp
            </a>
          </Button>
        )}
      </div>
      <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-xl bg-secondary/50 p-2 text-sm">
        {items.length === 0 && <li className="text-muted-foreground">Carregando itens…</li>}
        {items.map((i) => (
          <li key={i.id} className="flex justify-between gap-2">
            <span className="min-w-0">
              <span className="font-medium">{formatQty(i.qty, i.unit)}</span> {i.product_name}
            </span>
            <span className="shrink-0 text-muted-foreground">{formatBRL(i.total)}</span>
          </li>
        ))}
      </ul>
      {o.notes && <p className="mt-2 whitespace-pre-wrap text-sm"><span className="text-muted-foreground">Obs: </span>{o.notes}</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        {o.payment_condition_name} · Frete: {o.shipping_fee == null ? "a consultar" : formatBRL(o.shipping_fee)}
      </p>
      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="text-xl font-bold text-primary">{formatBRL(o.total)}</span>
        <div className="flex gap-1">
          <Button size="icon" variant="outline" title="Imprimir comanda" onClick={() => printOrder(o, items)}>
            <Printer />
          </Button>
          {o.status !== "faturado" && o.status !== "cancelado" && (
            <Button size="icon" variant="outline" title="Cancelar pedido" disabled={busy} onClick={() => confirm("Cancelar este pedido?") && onStatus("cancelado")}>
              <X />
            </Button>
          )}
          {next && (
            <Button size="sm" disabled={busy} onClick={() => onStatus(next.to)}>
              {next.label} <ArrowRight />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function printOrder(o: OrderWithCustomer, items: Item[]) {
  const w = window.open("", "_blank", "width=420,height=700");
  if (!w) return toast.error("Permita pop-ups para imprimir.");
  const rows = items
    .map(
      (i) =>
        `<tr><td>${esc(formatQty(i.qty, i.unit))}</td><td>${esc(i.product_name)}${i.sku ? ` <small>(${esc(i.sku)})</small>` : ""}</td><td class="r">${esc(formatBRL(i.total))}</td></tr>`,
    )
    .join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Pedido ${num(o.order_number)}</title>
<style>
body{font-family:Arial,sans-serif;color:#000;margin:0;padding:16px;max-width:80mm}
h1{font-size:18px;margin:0}h2{font-size:14px;margin:8px 0 4px}
p{margin:2px 0;font-size:12px}table{width:100%;border-collapse:collapse;font-size:12px}
td{padding:3px 0;border-bottom:1px dashed #999;vertical-align:top}.r{text-align:right;white-space:nowrap}
.t{font-size:16px;font-weight:bold;text-align:right;margin-top:8px}hr{border:0;border-top:1px dashed #000}
@media print{@page{margin:6mm}}
</style></head><body>
<h1>Trapiche Pescados</h1><p>Alameda Princesa Izabel, 1710 — Bigorrilho, Curitiba/PR</p><hr>
<h2>Pedido ${num(o.order_number)}</h2>
<p>Data: ${esc(formatDate(o.created_at, true))}</p>
<p>Status: ${esc(ORDER_STATUS_LABEL[o.status] ?? o.status)}</p>
<p>Cliente: ${esc(customerLabel(o.customer))}</p>
<p>Telefone: ${esc(o.customer?.phone || "—")}</p>
<p>Documento: ${esc(o.customer?.document || "—")}</p>
<p>Pagamento: ${esc(o.payment_condition_name)}</p>
${o.delivery_address ? `<p>Entrega: ${esc(o.delivery_address)}</p>` : ""}
<hr><table>${rows}</table>
<p class="r">Frete: ${esc(o.shipping_fee == null ? "a consultar" : formatBRL(o.shipping_fee))}</p>
<p class="t">Total: ${esc(formatBRL(o.total))}</p>
${o.notes ? `<hr><p><b>Obs:</b> ${esc(o.notes)}</p>` : ""}
<script>window.onload=function(){window.print();}</script>
</body></html>`);
  w.document.close();
}
