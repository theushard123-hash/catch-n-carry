import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatBRL, formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/pedidos/")({
  head: () => ({
    meta: [
      { title: "Meus pedidos — Portal Trapiche Pescados" },
      { name: "description", content: "Acompanhe o status dos seus pedidos na Trapiche Pescados." },
    ],
  }),
  component: OrdersPage,
});

export const padOrder = (n: number) => `#${String(n).padStart(4, "0")}`;

function OrdersPage() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meus pedidos</h1>
          <p className="text-sm text-muted-foreground">Histórico e status dos seus pedidos.</p>
        </div>
        <Button asChild variant="aqua">
          <Link to="/catalogo">Novo pedido</Link>
        </Button>
      </div>

      {q.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !q.data || q.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-ocean/50" />
          <p className="mt-3 font-semibold">Você ainda não fez pedidos</p>
          <p className="text-sm text-muted-foreground">Monte seu primeiro pedido no catálogo.</p>
          <Button asChild className="mt-4">
            <Link to="/catalogo">Ir para o catálogo</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-soft md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-semibold">{padOrder(o.order_number)}</TableCell>
                    <TableCell>{formatDate(o.created_at, true)}</TableCell>
                    <TableCell>{o.payment_condition_name}</TableCell>
                    <TableCell className="text-right font-semibold">{formatBRL(o.total)}</TableCell>
                    <TableCell>
                      <Badge variant={ORDER_STATUS_VARIANT[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/pedidos/$id" params={{ id: o.id }}>
                          Detalhes <ChevronRight />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-3 md:hidden">
            {q.data.map((o) => (
              <Link
                key={o.id}
                to="/pedidos/$id"
                params={{ id: o.id }}
                className="block rounded-2xl border bg-card p-4 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{padOrder(o.order_number)}</span>
                  <Badge variant={ORDER_STATUS_VARIANT[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(o.created_at, true)}</p>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{o.payment_condition_name}</span>
                  <span className="font-semibold">{formatBRL(o.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
