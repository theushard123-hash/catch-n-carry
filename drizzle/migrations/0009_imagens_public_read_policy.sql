create policy "Public read imagens"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'imagens');