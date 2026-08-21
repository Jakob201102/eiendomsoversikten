insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'egne-kontrakter',
  'egne-kontrakter',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.egne_kontrakter (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  navn text not null,
  filnavn text not null,
  filsti text not null unique,
  filtype text,
  filstorrelse bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.egne_kontrakter enable row level security;

drop policy if exists "Brukere kan se egne kontraktsmaler" on public.egne_kontrakter;
create policy "Brukere kan se egne kontraktsmaler" on public.egne_kontrakter
for select using (auth.uid() = user_id);

drop policy if exists "Brukere kan opprette egne kontraktsmaler" on public.egne_kontrakter;
create policy "Brukere kan opprette egne kontraktsmaler" on public.egne_kontrakter
for insert with check (auth.uid() = user_id);

drop policy if exists "Brukere kan oppdatere egne kontraktsmaler" on public.egne_kontrakter;
create policy "Brukere kan oppdatere egne kontraktsmaler" on public.egne_kontrakter
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Brukere kan slette egne kontraktsmaler" on public.egne_kontrakter;
create policy "Brukere kan slette egne kontraktsmaler" on public.egne_kontrakter
for delete using (auth.uid() = user_id);

drop policy if exists "Brukere kan se egne kontraktsfiler" on storage.objects;
create policy "Brukere kan se egne kontraktsfiler" on storage.objects
for select using (
  bucket_id = 'egne-kontrakter'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Brukere kan laste opp egne kontraktsfiler" on storage.objects;
create policy "Brukere kan laste opp egne kontraktsfiler" on storage.objects
for insert with check (
  bucket_id = 'egne-kontrakter'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Brukere kan slette egne kontraktsfiler" on storage.objects;
create policy "Brukere kan slette egne kontraktsfiler" on storage.objects
for delete using (
  bucket_id = 'egne-kontrakter'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create index if not exists egne_kontrakter_user_created_idx
on public.egne_kontrakter (user_id, created_at desc);
