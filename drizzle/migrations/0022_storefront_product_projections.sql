CREATE OR REPLACE FUNCTION public.storefront_featured_products()
RETURNS TABLE (id uuid, name text, description text, image_url text, unit text, price_varejo numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p.id, p.name, p.description, p.image_url, p.unit, p.price_varejo
  FROM public.products p
  WHERE p.active = true
  ORDER BY p.sort_order, p.name, p.id
  LIMIT 12;
$$;
REVOKE ALL ON FUNCTION public.storefront_featured_products() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storefront_featured_products() TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.storefront_featured_products() IS 'Public bounded storefront projection; active products only, no wholesale prices or private data.';

CREATE OR REPLACE FUNCTION public.catalog_sales_ranking()
RETURNS TABLE (product_id uuid, sales_rank bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p.id, row_number() OVER (ORDER BY count(DISTINCT o.id) DESC, p.sort_order, p.name, p.id)
  FROM public.products p
  LEFT JOIN public.order_items i ON i.product_id = p.id
  LEFT JOIN public.orders o ON o.id = i.order_id AND o.status = 'faturado'
  WHERE p.active = true AND auth.uid() IS NOT NULL
  GROUP BY p.id, p.sort_order, p.name;
$$;
REVOKE ALL ON FUNCTION public.catalog_sales_ranking() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.catalog_sales_ranking() TO authenticated, service_role;
COMMENT ON FUNCTION public.catalog_sales_ranking() IS 'Authenticated catalog ordering by distinct invoiced orders; returns rank only, never order/customer data or sales counts.';