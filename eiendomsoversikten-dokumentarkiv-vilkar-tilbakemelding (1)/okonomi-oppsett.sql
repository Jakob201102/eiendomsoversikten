insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('okonomi-bilag', 'okonomi-bilag', false, 20971520,
  array['application/pdf','image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public = false, file_size_limit = 20971520,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.okonomiposter (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bolig_id uuid references public.boliger(id) on delete set null,
  leietaker_id uuid references public.leietakere(id) on delete set null,
  dato date not null,
  forfallsdato date,
  type text not null check (type in ('inntekt','kostnad')),
  kategori text not null,
  beskrivelse text,
  belop numeric not null check (belop >= 0),
  betalt_belop numeric not null default 0 check (betalt_belop >= 0),
  betalingsdato date,
  status text not null default 'apen' check (status in ('apen','delvis','betalt')),
  fradragsstatus text not null default 'vurder' check (fradragsstatus in ('normalt','vurder','ikke')),
  kilde text not null default 'manuell' check (kilde in ('husleie','manuell')),
  periode text,
  unik_nokkel text,
  bilag_sti text,
  bilag_filnavn text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, unik_nokkel)
);

alter table public.okonomiposter enable row level security;
drop policy if exists "Brukere kan se egne økonomiposter" on public.okonomiposter;
create policy "Brukere kan se egne økonomiposter" on public.okonomiposter for select using (auth.uid() = user_id);
drop policy if exists "Brukere kan opprette egne økonomiposter" on public.okonomiposter;
create policy "Brukere kan opprette egne økonomiposter" on public.okonomiposter for insert with check (auth.uid() = user_id);
drop policy if exists "Brukere kan oppdatere egne økonomiposter" on public.okonomiposter;
create policy "Brukere kan oppdatere egne økonomiposter" on public.okonomiposter for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Brukere kan slette egne økonomiposter" on public.okonomiposter;
create policy "Brukere kan slette egne økonomiposter" on public.okonomiposter for delete using (auth.uid() = user_id);

drop policy if exists "Brukere kan se egne økonomibilag" on storage.objects;
create policy "Brukere kan se egne økonomibilag" on storage.objects for select using (bucket_id = 'okonomi-bilag' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "Brukere kan laste opp egne økonomibilag" on storage.objects;
create policy "Brukere kan laste opp egne økonomibilag" on storage.objects for insert with check (bucket_id = 'okonomi-bilag' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "Brukere kan slette egne økonomibilag" on storage.objects;
create policy "Brukere kan slette egne økonomibilag" on storage.objects for delete using (bucket_id = 'okonomi-bilag' and auth.uid()::text = (storage.foldername(name))[1]);

create index if not exists okonomiposter_user_dato_idx on public.okonomiposter(user_id, dato desc);
