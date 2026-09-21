DROP POLICY IF EXISTS "Public read imagens" ON storage.objects;

CREATE POLICY "Public read imagens public folders"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'imagens'
  AND (storage.foldername(name))[1] IN ('site', 'produtos', 'novidades')
);
