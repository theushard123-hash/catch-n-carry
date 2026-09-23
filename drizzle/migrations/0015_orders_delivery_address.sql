ALTER TABLE public.orders ADD COLUMN delivery_address text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.protect_order_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not private.is_admin() then
    new.user_id := old.user_id;
    new.order_number := old.order_number;
    new.customer_type := old.customer_type;
    new.payment_condition_id := old.payment_condition_id;
    new.payment_condition_name := old.payment_condition_name;
    new.subtotal := old.subtotal;
    new.total := old.total;
    new.external_id := old.external_id;
    new.admin_notes := old.admin_notes;
    new.notes := old.notes;
    new.delivery_date := old.delivery_date;
    new.delivery_address := old.delivery_address;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$function$;