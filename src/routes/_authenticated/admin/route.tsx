import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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

function AdminLayout() {
  return (
    <div className="animate-fade-up">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Administração</h1>
        <p className="text-sm text-muted-foreground">Gerencie produtos, condições de pagamento, clientes e pedidos.</p>
      </div>
      <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-muted-foreground">
        As telas de gestão (pedidos, produtos, pagamento, clientes e configurações) serão montadas na próxima etapa.
      </div>
      <Outlet />
    </div>
  );
}
