import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Clock, Package, ShoppingCart, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchOrdersWithCustomers, customerLabel } from "@/lib/admin-queries";
import { formatBRL, formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Visão geral — Administração Trapiche Pescados" },
      { name: "description", content: "Resumo de pedidos, clientes e produtos do portal." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [orders, pend, clients, products] = await Promise.all([
        supabase.from("orders").select("id, total, status", { count: "exact" }),
        supabase.from("orders").select("id", { count: "exact" }).eq("status", "pendente"),
        supabase.from("profiles").select("user_id", { count: "exact" }),
        supabase.from("products").select("id", { count: "exact" }).eq("active", true),
      ]);
      const faturado = (orders.data ?? [])
        .filter((o) => o.status === "faturado")
        .reduce((s, o) => s + Number(o.total), 0);
      return {
        totalOrders: orders.count ?? 0,
        pending: pend.count ?? 0,
        clients: clients.count ?? 0,
        products: products.count ?? 0,
        faturado,
      };
    },
  });

  const recent = useQuery({ queryKey: ["admin-recent-orders"], queryFn: () => fetchOrdersWithCustomers(6) });

  const cards = stats.data
    ? [
        { label: "Pedidos pendentes", value: String(stats.data.pending), icon: Clock, to: "/admin/pedidos" as const },
        { label: "Pedidos no total", value: String(stats.data.totalOrders), icon: ShoppingCart, to: "/admin/pedidos" as const },
        { label: "Clientes cadastrados", value: String(stats.data.clients), icon: Users, to: "/admin/clientes" as const },
        { label: "Produtos ativos", value: String(stats.data.products), icon: Package, to: "/admin/produtos" as const },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          : cards.map((c) => (
              <Link key={c.label} to={c.to} className="rounded-2xl border bg-card p-5 shadow-soft transition-transform hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <c.icon className="h-5 w-5 text-ocean" />
                </div>
                <p className="mt-2 text-3xl font-bold">{c.value}</p>
              </Link>
            ))}
      </div>

      {stats.data && (
        <div className="rounded-2xl border bg-gradient-ocean p-6 text-primary-foreground shadow-soft">
          <p className="text-sm text-primary-foreground/70">Total faturado pelo portal</p>
          <p className="mt-1 text-3xl font-bold text-aqua">{formatBRL(stats.data.faturado)}</p>
        </div>
      )}

      <div className="rounded-2xl border bg-card p-6 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Pedidos recentes</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/pedidos">
              Ver todos <ChevronRight />
            </Link>
          </Button>
        </div>
        {recent.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : !recent.data?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pedido recebido ainda.</p>
        ) : (
          <div className="divide-y">
            {recent.data.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="font-bold">#{String(o.order_number).padStart(4, "0")}</span>
                <span className="text-muted-foreground">{customerLabel(o.customer)}</span>
                <span className="ml-auto font-semibold">{formatBRL(o.total)}</span>
                <span className="text-xs text-muted-foreground">{formatDate(o.created_at, true)}</span>
                <Badge variant={ORDER_STATUS_VARIANT[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
