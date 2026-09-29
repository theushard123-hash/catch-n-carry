import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Search, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cigamStatus, lookupCigam, sendCustomerToCigam, sendOrderToCigam } from "@/lib/cigam.functions";
import { formatBRL, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/cigam")({
  head: () => ({
    meta: [
      { title: "Integração Cigam — Administração Trapiche Pescados" },
      { name: "description", content: "Envie pedidos e cadastros de clientes para o ERP Cigam." },
    ],
  }),
  component: CigamPage,
});

function SyncBadge({ s }: { s: string }) {
  if (s === "enviado") return <Badge variant="success">Enviado</Badge>;
  if (s === "erro") return <Badge variant="destructive">Erro</Badge>;
  return <Badge variant="outline">Não enviado</Badge>;
}

function CigamPage() {
  const qc = useQueryClient();
  const statusFn = useServerFn(cigamStatus);
  const sendOrderFn = useServerFn(sendOrderToCigam);
  const sendCustFn = useServerFn(sendCustomerToCigam);
  const lookupFn = useServerFn(lookupCigam);

  const status = useQuery({ queryKey: ["cigam-status"], queryFn: () => statusFn() });
  const orders = useQuery({
    queryKey: ["cigam-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, created_at, total, status, external_id, cigam_sync_status, cigam_sync_error")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
  const customers = useQuery({
    queryKey: ["cigam-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, document, customer_type, external_code, cigam_sync_status, cigam_sync_error")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
  const conds = useQuery({
    queryKey: ["cigam-conds"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_conditions").select("id, name, external_code").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const onResult = (keys: string[]) => (r: { ok: boolean; message: string }) => {
    r.ok ? toast.success(r.message) : toast.error(r.message);
    keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
  const sendOrder = useMutation({ mutationFn: (id: string) => sendOrderFn({ data: { orderId: id } }), onSuccess: onResult(["cigam-orders"]), onError: (e: Error) => toast.error(e.message) });
  const sendCust = useMutation({ mutationFn: (id: string) => sendCustFn({ data: { profileId: id } }), onSuccess: onResult(["cigam-customers"]), onError: (e: Error) => toast.error(e.message) });
  const saveCode = useMutation({
    mutationFn: async ({ table, id, code }: { table: "profiles" | "payment_conditions"; id: string; code: string }) => {
      const { error } = await supabase.from(table).update({ external_code: code.trim() || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Código salvo."); qc.invalidateQueries(); },
    onError: () => toast.error("Não foi possível salvar."),
  });

  const [kind, setKind] = useState<"pedido" | "cliente">("pedido");
  const [value, setValue] = useState("");
  const lookup = useMutation({ mutationFn: () => lookupFn({ data: { kind, value } }), onError: (e: Error) => toast.error(e.message) });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-soft">
        <div>
          <p className="font-semibold">Conexão com o Cigam</p>
          <p className="text-sm text-muted-foreground">{status.isLoading ? "Verificando..." : status.data?.message ?? "Não foi possível verificar."}</p>
        </div>
        <div className="flex items-center gap-2">
          {status.data && (status.data.connected ? <Badge variant="success">Conectado</Badge> : <Badge variant="destructive">Desconectado</Badge>)}
          <Button variant="outline" size="sm" onClick={() => status.refetch()} disabled={status.isFetching}>
            <RefreshCw /> Testar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pedidos">
        <TabsList>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="clientes">Cadastros</TabsTrigger>
          <TabsTrigger value="pagamento">Códigos de pagamento</TabsTrigger>
          <TabsTrigger value="consulta">Consultar Cigam</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos">
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <Table>
              <TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Cigam</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {(orders.data ?? []).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-semibold">#{String(o.order_number).padStart(4, "0")}{o.external_id && <span className="ml-2 text-xs text-muted-foreground">Cigam {o.external_id}</span>}</TableCell>
                    <TableCell>{formatDate(o.created_at, true)}</TableCell>
                    <TableCell className="text-right">{formatBRL(o.total)}</TableCell>
                    <TableCell><SyncBadge s={o.cigam_sync_status} />{o.cigam_sync_error && <p className="mt-1 max-w-xs text-xs text-destructive">{o.cigam_sync_error}</p>}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" disabled={sendOrder.isPending} onClick={() => sendOrder.mutate(o.id)}><Send /> {o.cigam_sync_status === "enviado" ? "Reenviar" : "Enviar"}</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="clientes">
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <Table>
              <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Documento</TableHead><TableHead>Código Cigam</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {(customers.data ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.company_name || c.full_name}<span className="ml-2 text-xs text-muted-foreground">{c.customer_type}</span></TableCell>
                    <TableCell>{c.document}</TableCell>
                    <TableCell>
                      <Input className="h-8 w-28" defaultValue={c.external_code ?? ""} placeholder="—" onBlur={(e) => e.target.value !== (c.external_code ?? "") && saveCode.mutate({ table: "profiles", id: c.id, code: e.target.value })} />
                    </TableCell>
                    <TableCell><SyncBadge s={c.cigam_sync_status} />{c.cigam_sync_error && <p className="mt-1 max-w-xs text-xs text-destructive">{c.cigam_sync_error}</p>}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" disabled={sendCust.isPending} onClick={() => sendCust.mutate(c.id)}><Send /> Enviar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="pagamento">
          <div className="space-y-2 rounded-2xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Informe o código de cada condição de pagamento no Cigam. Os produtos usam o campo SKU como código de material.</p>
            {(conds.data ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3">
                <span>{c.name}</span>
                <Input className="h-8 w-32" defaultValue={c.external_code ?? ""} placeholder="Código" onBlur={(e) => e.target.value !== (c.external_code ?? "") && saveCode.mutate({ table: "payment_conditions", id: c.id, code: e.target.value })} />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="consulta">
          <div className="space-y-3 rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap gap-2">
              <Button variant={kind === "pedido" ? "default" : "outline"} size="sm" onClick={() => setKind("pedido")}>Pedido</Button>
              <Button variant={kind === "cliente" ? "default" : "outline"} size="sm" onClick={() => setKind("cliente")}>Cliente</Button>
              <Input className="h-9 max-w-xs" value={value} onChange={(e) => setValue(e.target.value)} placeholder={kind === "pedido" ? "Código do pedido" : "CPF/CNPJ ou código"} />
              <Button size="sm" disabled={!value || lookup.isPending} onClick={() => lookup.mutate()}><Search /> Buscar</Button>
            </div>
            {lookup.data && (lookup.data.ok ? <pre className="max-h-96 overflow-auto rounded-xl bg-muted p-3 text-xs">{lookup.data.result}</pre> : <p className="text-sm text-destructive">{lookup.data.message}</p>)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
