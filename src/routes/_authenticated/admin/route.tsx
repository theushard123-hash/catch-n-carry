import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin");
    if (!roles || roles.length === 0) throw redirect({ to: "/catalogo" });
  },
  component: AdminLayout,
});

const tabs = [
  { to: "/admin", label: "Visão geral", exact: true },
  { to: "/admin/pedidos", label: "Pedidos" },
  { to: "/admin/produtos", label: "Produtos" },
  { to: "/admin/condicoes", label: "Pagamento" },
  { to: "/admin/clientes", label: "Clientes" },
  { to: "/admin/configuracoes", label: "Configurações" },
] as const;

function AdminLayout() {
  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Administração</h1>
        <p className="text-sm text-muted-foreground">Gerencie produtos, condições de pagamento, clientes e pedidos.</p>
      </div>
      <nav className="mb-8 flex gap-1 overflow-x-auto rounded-xl border bg-card p-1 shadow-soft">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: "exact" in t && t.exact }}
            className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
