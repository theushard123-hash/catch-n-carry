create or replace function public.protect_order_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.protect_order_fields() from public, anon, authenticated;

drop trigger if exists trg_protect_order_fields on public.orders;
create trigger trg_protect_order_fields
before update on public.orders
for each row execute function public.protect_order_fields();