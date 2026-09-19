GRANT SELECT ON public.banners TO anon;

CREATE POLICY "Public read active banners"
ON public.banners
FOR SELECT
TO anon
USING (active = true);