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

  INSERT INTO public.profiles (
    user_id, email, full_name, company_name, document, phone, customer_type, state_registration,
    zip, address, neighborhood, city, state
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'document', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    v_type,
    COALESCE(NEW.raw_user_meta_data->>'state_registration', ''),
    COALESCE(NEW.raw_user_meta_data->>'zip', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', ''),
    COALESCE(NEW.raw_user_meta_data->>'neighborhood', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'state',''), 'PR')
  );

  -- New signups are always plain users. Admin roles are granted explicitly.
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
