ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state_registration text NOT NULL DEFAULT '';

ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS hero_image_url text NOT NULL DEFAULT '';
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '';
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS hero_title text NOT NULL DEFAULT '';
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS hero_subtitle text NOT NULL DEFAULT '';

GRANT SELECT ON public.app_settings TO anon;
DROP POLICY IF EXISTS "Public read settings" ON public.app_settings;
CREATE POLICY "Public read settings" ON public.app_settings FOR SELECT TO anon USING (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_type public.customer_type := 'varejo';
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'customer_type','') = 'atacado' THEN
    v_type := 'atacado';
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, company_name, document, phone, customer_type, state_registration)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'document', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    v_type,
    COALESCE(NEW.raw_user_meta_data->>'state_registration', '')
  );

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    UPDATE public.profiles SET approved = true WHERE user_id = NEW.id;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$function$;