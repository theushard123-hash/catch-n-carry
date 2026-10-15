ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor';

CREATE OR REPLACE FUNCTION private.is_seller()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'vendedor')
$$;
REVOKE ALL ON FUNCTION private.is_seller() FROM public, anon;
GRANT EXECUTE ON FUNCTION private.is_seller() TO authenticated;

CREATE POLICY "Sellers read orders" ON public.orders FOR SELECT TO authenticated USING (private.is_seller());
CREATE POLICY "Sellers update order status" ON public.orders FOR UPDATE TO authenticated USING (private.is_seller()) WITH CHECK (private.is_seller());
CREATE POLICY "Sellers read order items" ON public.order_items FOR SELECT TO authenticated USING (private.is_seller());
CREATE POLICY "Sellers read customer profiles" ON public.profiles FOR SELECT TO authenticated USING (private.is_seller());