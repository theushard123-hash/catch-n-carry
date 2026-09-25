CREATE TABLE public.shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL DEFAULT 'Curitiba',
  neighborhood text NOT NULL DEFAULT '',
  fee numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_rates TO authenticated;
GRANT ALL ON public.shipping_rates TO service_role;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage shipping" ON public.shipping_rates FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "Authenticated read shipping" ON public.shipping_rates FOR SELECT TO authenticated USING (active = true OR private.is_admin());
ALTER TABLE public.orders ADD COLUMN shipping_fee numeric;
ALTER TABLE public.orders ADD COLUMN shipping_note text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION public.protect_order_fields()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not private.is_admin() then
    new.user_id := old.user_id; new.order_number := old.order_number; new.customer_type := old.customer_type;
    new.payment_condition_id := old.payment_condition_id; new.payment_condition_name := old.payment_condition_name;
    new.subtotal := old.subtotal; new.total := old.total; new.external_id := old.external_id;
    new.admin_notes := old.admin_notes; new.notes := old.notes; new.delivery_date := old.delivery_date;
    new.delivery_address := old.delivery_address; new.created_at := old.created_at;
    new.shipping_fee := old.shipping_fee; new.shipping_note := old.shipping_note;
  end if;
  new.updated_at := now();
  return new;
end;
$function$;