-- ============================================================
-- EDITORIAL CIENCIA - CONFIGURACIÓN INICIAL DE SUPABASE
-- Ejecutar una sola vez en: Supabase > SQL Editor > New query
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.libros (
  id uuid primary key default gen_random_uuid(),
  codigo text,
  categoria text not null check (categoria in ('Obras extranjeras','Obras nacionales','Libros preuniversitarios')),
  titulo text not null,
  autor text,
  genero text,
  precio_caja numeric(12,2),
  unidades_caja integer,
  precio_compra numeric(12,2),
  precio_venta numeric(12,2),
  precio_mayor numeric(12,2),
  stock integer not null default 0 check (stock >= 0),
  vendidas integer not null default 0 check (vendidas >= 0),
  acumulado numeric(14,2) not null default 0,
  portada_path text,
  portada_url text,
  muestra_pdf_path text,
  muestra_pdf_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists libros_categoria_idx on public.libros(categoria);
create index if not exists libros_titulo_idx on public.libros(titulo);
create index if not exists libros_autor_idx on public.libros(autor);
create index if not exists libros_codigo_idx on public.libros(codigo);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_libros_updated_at on public.libros;
create trigger trg_libros_updated_at
before update on public.libros
for each row execute function public.set_updated_at();

-- RLS de la tabla
alter table public.libros enable row level security;

drop policy if exists "Catalogo publico" on public.libros;
create policy "Catalogo publico"
on public.libros for select
to anon
using (activo = true);

drop policy if exists "Admin puede leer todo" on public.libros;
create policy "Admin puede leer todo"
on public.libros for select
to authenticated
using (true);

drop policy if exists "Admin puede insertar" on public.libros;
create policy "Admin puede insertar"
on public.libros for insert
to authenticated
with check (true);

drop policy if exists "Admin puede actualizar" on public.libros;
create policy "Admin puede actualizar"
on public.libros for update
to authenticated
using (true)
with check (true);

drop policy if exists "Admin puede eliminar" on public.libros;
create policy "Admin puede eliminar"
on public.libros for delete
to authenticated
using (true);

-- Permisos de Data API
grant select on table public.libros to anon;
grant select, insert, update, delete on table public.libros to authenticated;

-- ============================================================
-- STORAGE
-- ============================================================
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'portadas',
  'portadas',
  true,
  2097152,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'muestras-pdf',
  'muestras-pdf',
  true,
  6291456,
  array['application/pdf']::text[]
)
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

-- Lectura pública: necesario para mostrar portadas y PDFs de muestra.
drop policy if exists "Lectura publica archivos catalogo" on storage.objects;
create policy "Lectura publica archivos catalogo"
on storage.objects for select
to public
using (bucket_id in ('portadas','muestras-pdf'));

-- El usuario autenticado del panel admin puede subir archivos.
drop policy if exists "Admin sube archivos catalogo" on storage.objects;
create policy "Admin sube archivos catalogo"
on storage.objects for insert
to authenticated
with check (bucket_id in ('portadas','muestras-pdf'));

drop policy if exists "Admin actualiza archivos catalogo" on storage.objects;
create policy "Admin actualiza archivos catalogo"
on storage.objects for update
to authenticated
using (bucket_id in ('portadas','muestras-pdf'))
with check (bucket_id in ('portadas','muestras-pdf'));

drop policy if exists "Admin elimina archivos catalogo" on storage.objects;
create policy "Admin elimina archivos catalogo"
on storage.objects for delete
to authenticated
using (bucket_id in ('portadas','muestras-pdf'));

-- FIN
