-- 1) Private schema for internal SECURITY DEFINER helpers (not exposed to the API)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.has_role(auth.uid(), 'admin')
$$;

GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2) Recreate every policy to reference the private helper
DROP POLICY IF EXISTS "Admins manage settings" ON public.app_settings;
CREATE POLICY "Admins manage settings" ON public.app_settings FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS "Authenticated read categories" ON public.categories;
CREATE POLICY "Authenticated read categories" ON public.categories FOR SELECT TO authenticated
  USING (active = true OR private.is_admin());

DROP POLICY IF EXISTS "Admins manage order items" ON public.order_items;
CREATE POLICY "Admins manage order items" ON public.order_items FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins manage payment conditions" ON public.payment_conditions;
CREATE POLICY "Admins manage payment conditions" ON public.payment_conditions FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS "Authenticated read payment conditions" ON public.payment_conditions;
CREATE POLICY "Authenticated read payment conditions" ON public.payment_conditions FOR SELECT TO authenticated
  USING (active = true OR private.is_admin());

DROP POLICY IF EXISTS "Admins manage products" ON public.products;
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS "Authenticated read products" ON public.products;
CREATE POLICY "Authenticated read products" ON public.products FOR SELECT TO authenticated
  USING (active = true OR private.is_admin());

DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins upload imagens" ON storage.objects;
CREATE POLICY "Admins upload imagens" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'imagens' AND private.is_admin());
DROP POLICY IF EXISTS "Admins update imagens" ON storage.objects;
CREATE POLICY "Admins update imagens" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'imagens' AND private.is_admin()) WITH CHECK (bucket_id = 'imagens' AND private.is_admin());
DROP POLICY IF EXISTS "Admins delete imagens" ON storage.objects;
CREATE POLICY "Admins delete imagens" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'imagens' AND private.is_admin());

-- 3) Trigger function must use the private helper as well
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.is_admin() THEN
    NEW.approved := OLD.approved;
    NEW.customer_type := OLD.customer_type;
    NEW.external_code := OLD.external_code;
    NEW.admin_notes := OLD.admin_notes;
    NEW.user_id := OLD.user_id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 4) Drop the publicly exposed helpers
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 5) Trigger-only functions must not be callable through the API
REVOKE ALL ON FUNCTION public.protect_profile_fields() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;

-- 6) app_settings is no longer readable by unauthenticated visitors;
--    the public landing page reads its data through a server function instead.
DROP POLICY IF EXISTS "Public read settings" ON public.app_settings;
REVOKE ALL ON TABLE public.app_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;