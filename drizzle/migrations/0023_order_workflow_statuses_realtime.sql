ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'em_separacao';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pronto_envio';
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;