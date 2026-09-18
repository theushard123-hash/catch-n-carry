import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { LayoutDashboard, Package, Settings, ShoppingCart, Users, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administração — Portal Trapiche Pescados" },
      { name: "description", content: "Painel de gestão de produtos, condições de pagamento, clientes e pedidos." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin");
    if (!roles || roles.length === 0) throw redirect({ to: "/catalogo" });
  },
  component: AdminLayout,
});

const tabs: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/condicoes", label: "Pagamento", icon: Wallet },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

function AdminLayout() {
  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Administração</h1>
        <p className="text-sm text-muted-foreground">Gerencie produtos, condições de pagamento, clientes e pedidos.</p>
      </div>
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border bg-card p-1.5 shadow-soft">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: t.exact === true }}
            activeProps={{ className: "bg-primary text-primary-foreground shadow-soft" }}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
