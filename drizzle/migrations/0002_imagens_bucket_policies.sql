CREATE POLICY "Public read imagens" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'imagens');
CREATE POLICY "Admins upload imagens" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'imagens' AND public.is_admin());
CREATE POLICY "Admins update imagens" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'imagens' AND public.is_admin()) WITH CHECK (bucket_id = 'imagens' AND public.is_admin());
CREATE POLICY "Admins delete imagens" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'imagens' AND public.is_admin());