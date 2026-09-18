-- Remove a view (gerava alerta de security definer view)
drop view if exists public.public_site_settings;

-- Leitura anônima apenas das colunas públicas exibidas na página inicial
create policy "Public read settings"
  on public.app_settings
  for select
  to anon
  using (true);

revoke select on public.app_settings from anon;
grant select (id, company_name, whatsapp, logo_url, hero_image_url, hero_title, hero_subtitle)
  on public.app_settings to anon;