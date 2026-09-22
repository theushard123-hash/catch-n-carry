-- 1) app_settings: remove the "everyone signed-in reads everything" policy that
--    exposed contact_email. Admins keep full access via "Admins manage settings".
DROP POLICY IF EXISTS "Authenticated read settings" ON public.app_settings;

-- Customer-facing settings (no contact_email) via a definer view.
CREATE OR REPLACE VIEW public.app_settings_customer
WITH (security_invoker = false) AS
SELECT
  s.id,
  s.company_name,
  s.whatsapp,
  s.notice,
  s.require_approval,
  s.min_order_atacado,
  s.min_order_varejo,
  s.logo_url,
  s.hero_image_url,
  s.hero_title,
  s.hero_subtitle
FROM public.app_settings s;

REVOKE ALL ON public.app_settings_customer FROM PUBLIC;
GRANT SELECT ON public.app_settings_customer TO authenticated;
GRANT SELECT ON public.app_settings_customer TO service_role;

COMMENT ON VIEW public.app_settings_customer IS
  'Customer-facing subset of app_settings; excludes internal contact_email.';

-- 2) storage.objects: drop the blanket public read policy. Site images are
--    served through long-lived signed URLs, which do not require this policy.
DROP POLICY IF EXISTS "Public read imagens public folders" ON storage.objects;
