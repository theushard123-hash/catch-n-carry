import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Vendedor (sem ser admin) só gerencia pedidos: qualquer tela de compra
 * (catálogo, carrinho, perfil, pedidos de cliente) redireciona para o
 * painel de vendas. O bloqueio real dos dados continua no backend (RLS);
 * isto é apenas o direcionamento de navegação.
 */
export async function redirectSellerToSales() {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const list = (roles ?? []).map((r) => r.role);
  const isSeller = list.includes("vendedor");
  const isAdmin = list.includes("admin");
  if (isSeller && !isAdmin) {
    throw redirect({ to: "/admin/pedidos" });
  }
}
