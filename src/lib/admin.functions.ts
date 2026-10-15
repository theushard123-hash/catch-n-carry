import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-side admin check. Validates the Supabase bearer token and reads the
 * caller's roles with RLS applied, so admin access can never be granted by
 * client-side state alone.
 */
export const checkAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (error) throw error;
    const roles = (data ?? []).map((r) => r.role);
    return { isAdmin: roles.includes("admin"), isSeller: roles.includes("vendedor") };
  });
