import { createServerFn } from "@tanstack/react-start";

export type PublicSettings = {
  company_name: string;
  whatsapp: string;
  logo_url: string;
  hero_image_url: string;
  hero_title: string;
  hero_subtitle: string;
};

/**
 * Public (unauthenticated) site data. Only the columns that are actually shown
 * on the public landing page are returned — internal configuration such as
 * contact_email, minimum order values or require_approval never leaves the server.
 */
export const getPublicSettings = createServerFn({ method: "GET" }).handler(async (): Promise<PublicSettings> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("company_name, whatsapp, logo_url, hero_image_url, hero_title, hero_subtitle")
    .eq("id", 1)
    .maybeSingle();

  return {
    company_name: data?.company_name ?? "Trapiche Pescados",
    whatsapp: data?.whatsapp ?? "",
    logo_url: data?.logo_url ?? "",
    hero_image_url: data?.hero_image_url ?? "",
    hero_title: data?.hero_title ?? "",
    hero_subtitle: data?.hero_subtitle ?? "",
  };
});
