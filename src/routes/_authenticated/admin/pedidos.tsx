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
import logoMark from "@/assets/logo-mark.png";

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
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

function printOrder(o: OrderWithCustomer, items: Item[]) {
  if (!items.length) {
    toast.error("Aguarde o carregamento dos itens antes de imprimir.");
    return;
  }
  const w = window.open("", "_blank", "width=1000,height=900");
  if (!w) {
    toast.error("Permita pop-ups para imprimir.");
    return;
  }
  const rows = items
    .map(
      (i) =>
        `<tbody><tr class="item"><td>${esc(i.sku || "—")}</td><td class="description">${esc(i.product_name)}</td><td>${esc(i.unit)}</td><td>${esc(formatQty(i.qty))}</td><td></td><td></td><td class="r">${esc(formatBRL(i.unit_price))}</td><td><span class="check"></span></td></tr><tr class="item-note"><td colspan="8">Observação do item: <span class="writing-line"></span></td></tr></tbody>`,
    )
    .join("");
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pedido Separação ${num(o.order_number)} — Trapiche Pescados</title>
<style>
/* Dedicated monochrome paper tokens keep print independent of the app theme. */
:root{--paper:#fff;--ink:#111;--rule:#777;--heading:#eee}
*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:var(--ink);background:var(--paper);margin:0;font-size:11px}
.sheet{width:100%;max-width:190mm;margin:0 auto;padding:8mm 0}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6mm}h1{font-size:22px;margin:0;flex:1;text-align:center}header img{width:26mm;height:18mm;object-fit:contain}header .spacer{width:26mm}
.top{display:grid;grid-template-columns:minmax(0,1fr) 58mm;gap:6mm}.details p{margin:0 0 3mm;overflow-wrap:anywhere;line-height:1.45}.details b{display:inline-block;min-width:26mm}
.verification{border:1px solid var(--rule);padding:4mm;display:flex;flex-direction:column;justify-content:space-between;min-height:54mm}.signature{height:13mm;border-bottom:1px solid var(--rule);margin-bottom:4mm}.verification p{margin:0}.date{border-top:1px solid var(--rule);padding-top:3mm}
.notes{display:grid;grid-template-columns:26mm 1fr;gap:3mm;margin:4mm 0;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;min-height:10mm}
.order-number{border-top:1px solid var(--rule);text-align:center;font-size:16px;padding:3mm 0;margin-top:5mm}
table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px}thead{display:table-header-group}tbody{break-inside:avoid;page-break-inside:avoid}th,td{border:1px solid var(--rule);padding:2mm 1.5mm;text-align:center;overflow-wrap:anywhere}th{font-weight:normal;background:var(--heading)}.item td{height:13mm}.description{text-align:left}.r{text-align:right}.item-note td{text-align:left;height:7mm;font-size:9px}.writing-line{display:inline-block;width:70%;border-bottom:1px solid var(--rule);height:3mm}.check{display:inline-block;width:4mm;height:4mm;border:1px solid var(--rule)}
.bottom{display:flex;justify-content:space-between;gap:6mm;margin-top:5mm;break-inside:avoid}.payment{flex:1;line-height:1.6;overflow-wrap:anywhere}.totals{min-width:56mm}.totals p{display:flex;justify-content:space-between;gap:4mm;margin:0;padding:1.5mm 0}.total{border-top:1px solid var(--rule);font-weight:bold;font-size:14px}footer{margin-top:8mm;border-top:1px solid var(--rule);padding-top:3mm;text-align:center;font-size:9px;break-inside:avoid}
@page{size:A4 portrait;margin:10mm} @media print{.sheet{max-width:none;padding:0}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body><main class="sheet">
<header><span class="spacer"></span><h1>Pedido Separação</h1><img src="${esc(new URL(logoMark, window.location.origin).href)}" alt="Trapiche Pescados"></header>
<section class="top"><div class="details">
<p><b>Unidade:</b> Trapiche Pescados — Curitiba</p>
<p><b>Cliente:</b> ${esc(customerLabel(o.customer))}</p>
<p><b>CNPJ / CPF:</b> ${esc(o.customer?.document || "—")}</p>
<p><b>Telefone:</b> ${esc(o.customer?.phone || "—")}</p>
<p><b>Entrega:</b> ${esc(o.delivery_address || "—")}</p>
<p><b>Data/Hora:</b> ${esc(formatDate(o.created_at, true))}</p>
<p><b>Status:</b> ${esc(ORDER_STATUS_LABEL[o.status] ?? o.status)}</p>
</div><div class="verification"><div><b>Separado por:</b><div class="signature"></div><b>Conferido por:</b><div class="signature"></div></div><p class="date">Data: ____ / ____ / ________</p></div></section>
<div class="notes"><b>Observação do pedido:</b><span>${esc(o.admin_notes || "")}</span></div>
<div class="notes"><b>Observação do cliente:</b><span>${esc(o.notes || "")}</span></div>
<div class="order-number">Pedido: ${num(o.order_number)}</div>
<table><colgroup><col style="width:14%"><col style="width:30%"><col style="width:6%"><col style="width:10%"><col style="width:8%"><col style="width:12%"><col style="width:14%"><col style="width:6%"></colgroup><thead><tr><th>Material</th><th>Descrição</th><th>U.M.</th><th>Quantidade</th><th>Lote</th><th>Qtd. separada</th><th>Preço unit.</th><th>Check</th></tr></thead>${rows}</table>
<section class="bottom"><div class="payment"><b>Pagamento:</b> ${esc(o.payment_condition_name)}${o.shipping_note ? `<br><b>Frete:</b> ${esc(o.shipping_note)}` : ""}</div><div class="totals"><p><span>Subtotal</span><span>${esc(formatBRL(o.subtotal))}</span></p><p><span>Frete</span><span>${esc(o.shipping_fee == null ? "A consultar" : formatBRL(o.shipping_fee))}</span></p><p class="total"><span>Total</span><span>${esc(formatBRL(o.total))}</span></p></div></section>
<footer>Trapiche Pescados · Alameda Princesa Izabel, 1710 — Bigorrilho, Curitiba/PR</footer>
</main><script>window.onload=function(){window.focus();window.print();}</script>
</body></html>`);
  w.document.close();
}
