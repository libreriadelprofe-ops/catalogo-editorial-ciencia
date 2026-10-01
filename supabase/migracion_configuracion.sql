-- ============================================================
-- EDITORIAL CIENCIA - CONFIGURACIÓN DE LA LIBRERÍA
-- (celular de WhatsApp, ubicación y logo)
-- Ejecutar una sola vez en: Supabase > SQL Editor > New query
-- Es seguro volver a ejecutarlo. Las imágenes se guardan en el
-- bucket "portadas" que ya existe (carpeta config/).
-- ============================================================

create table if not exists public.configuracion (
  id integer primary key default 1 check (id = 1),
  whatsapp text,
  ubicacion_url text,
  ubicacion_imagen_path text,
  ubicacion_imagen_url text,
  logo_path text,
  logo_url text,
  updated_at timestamptz not null default now()
);

insert into public.configuracion (id) values (1) on conflict (id) do nothing;

alter table public.configuracion enable row level security;

drop policy if exists "Configuracion publica" on public.configuracion;
create policy "Configuracion publica" on public.configuracion for select to anon using (true);

drop policy if exists "Admin lee configuracion" on public.configuracion;
create policy "Admin lee configuracion" on public.configuracion for select to authenticated using (true);

drop policy if exists "Admin inserta configuracion" on public.configuracion;
create policy "Admin inserta configuracion" on public.configuracion for insert to authenticated with check (id = 1);

drop policy if exists "Admin actualiza configuracion" on public.configuracion;
create policy "Admin actualiza configuracion" on public.configuracion for update to authenticated using (true) with check (id = 1);

grant select on table public.configuracion to anon;
grant select, insert, update on table public.configuracion to authenticated;
