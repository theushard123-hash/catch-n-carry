ALTER TABLE public.payment_conditions ADD COLUMN IF NOT EXISTS external_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cigam_sync_status text NOT NULL DEFAULT 'nao_enviado',
  ADD COLUMN IF NOT EXISTS cigam_sync_error text,
  ADD COLUMN IF NOT EXISTS cigam_synced_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cigam_sync_status text NOT NULL DEFAULT 'nao_enviado',
  ADD COLUMN IF NOT EXISTS cigam_sync_error text,
  ADD COLUMN IF NOT EXISTS cigam_synced_at timestamptz;

CREATE TABLE public.cigam_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  entity text NOT NULL,
  entity_id uuid,
  success boolean NOT NULL,
  message text,
  created_by uuid
);
GRANT SELECT, INSERT ON public.cigam_sync_log TO authenticated;
GRANT ALL ON public.cigam_sync_log TO service_role;
ALTER TABLE public.cigam_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read cigam log" ON public.cigam_sync_log FOR SELECT TO authenticated USING (private.is_admin());
CREATE POLICY "Admins write cigam log" ON public.cigam_sync_log FOR INSERT TO authenticated WITH CHECK (private.is_admin());