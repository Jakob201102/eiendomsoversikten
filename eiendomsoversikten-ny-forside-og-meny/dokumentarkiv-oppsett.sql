create table if not exists public.dokumenter (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bolig_id uuid references public.boliger(id) on delete set null,
  navn text not null,
  kategori text not null,
  ar integer not null check (ar between 1900 and 2200),
  dokumentdato date,
  notat text,
  filsti text not null,
  filnavn text not null,
  filtype text,
  filstorrelse bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.dokumenter enable row level security;
drop policy if exists "Brukere leser egne dokumenter" on public.dokumenter;
drop policy if exists "Brukere oppretter egne dokumenter" on public.dokumenter;
drop policy if exists "Brukere sletter egne dokumenter" on public.dokumenter;
create policy "Brukere leser egne dokumenter" on public.dokumenter for select to authenticated using (auth.uid() = user_id);
create policy "Brukere oppretter egne dokumenter" on public.dokumenter for insert to authenticated with check (auth.uid() = user_id);
create policy "Brukere sletter egne dokumenter" on public.dokumenter for delete to authenticated using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dokumentarkiv', 'dokumentarkiv', false, 26214400, array['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "Brukere leser egne arkivfiler" on storage.objects;
drop policy if exists "Brukere laster opp egne arkivfiler" on storage.objects;
drop policy if exists "Brukere sletter egne arkivfiler" on storage.objects;
create policy "Brukere leser egne arkivfiler" on storage.objects for select to authenticated using (bucket_id = 'dokumentarkiv' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Brukere laster opp egne arkivfiler" on storage.objects for insert to authenticated with check (bucket_id = 'dokumentarkiv' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Brukere sletter egne arkivfiler" on storage.objects for delete to authenticated using (bucket_id = 'dokumentarkiv' and (storage.foldername(name))[1] = auth.uid()::text);
