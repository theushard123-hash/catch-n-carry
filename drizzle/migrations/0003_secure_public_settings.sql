-- View pública com apenas os campos exibidos na página inicial (sem dados internos)
create or replace view public.public_site_settings as
  select id, company_name, whatsapp, logo_url, hero_image_url, hero_title, hero_subtitle
  from public.app_settings;

grant select on public.public_site_settings to anon, authenticated;

-- Revoga a leitura anônima direta da tabela completa de configurações
drop policy "Public read settings" on public.app_settings;

-- has_role: somente usuários autenticados precisam executar (usada nas políticas RLS)
revoke execute on function public.has_role(uuid, public.app_role) from anon, public;

-- handle_new_user é função de trigger; ninguém precisa executá-la diretamente
revoke execute on function public.handle_new_user() from public, anon, authenticated;