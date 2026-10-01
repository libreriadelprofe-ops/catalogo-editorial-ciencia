-- ============================================================
-- EDITORIAL CIENCIA - CATEGORÍAS EDITABLES
-- Ejecutar una sola vez en: Supabase > SQL Editor > New query
-- (después de setup.sql). Es seguro volver a ejecutarlo.
-- ============================================================

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique check (length(btrim(nombre)) > 0),
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.categorias (nombre, orden) values
  ('Obras extranjeras', 1),
  ('Obras nacionales', 2),
  ('Libros preuniversitarios', 3)
on conflict (nombre) do nothing;

-- Si ya había libros con otra categoría, se conservan.
insert into public.categorias (nombre, orden)
select distinct categoria, 100 from public.libros
where categoria not in (select nombre from public.categorias)
on conflict (nombre) do nothing;

-- Se reemplaza la lista fija por una relación: al renombrar una categoría,
-- los libros se actualizan solos; no se puede borrar una categoría con libros.
alter table public.libros drop constraint if exists libros_categoria_check;
alter table public.libros drop constraint if exists libros_categoria_fkey;
alter table public.libros add constraint libros_categoria_fkey
  foreign key (categoria) references public.categorias(nombre)
  on update cascade on delete restrict;

alter table public.categorias enable row level security;

drop policy if exists "Categorias publicas" on public.categorias;
create policy "Categorias publicas" on public.categorias for select to anon using (true);

drop policy if exists "Admin lee categorias" on public.categorias;
create policy "Admin lee categorias" on public.categorias for select to authenticated using (true);

drop policy if exists "Admin inserta categorias" on public.categorias;
create policy "Admin inserta categorias" on public.categorias for insert to authenticated with check (true);

drop policy if exists "Admin actualiza categorias" on public.categorias;
create policy "Admin actualiza categorias" on public.categorias for update to authenticated using (true) with check (true);

drop policy if exists "Admin elimina categorias" on public.categorias;
create policy "Admin elimina categorias" on public.categorias for delete to authenticated using (true);

grant select on table public.categorias to anon;
grant select, insert, update, delete on table public.categorias to authenticated;
