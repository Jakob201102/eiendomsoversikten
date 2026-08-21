create table if not exists public.tilbakemeldinger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('feil', 'forslag', 'annet')),
  melding text not null check (char_length(melding) between 5 and 5000),
  kontakt_epost text,
  side text,
  status text not null default 'ny',
  created_at timestamptz not null default now()
);
alter table public.tilbakemeldinger enable row level security;
drop policy if exists "Brukere kan sende tilbakemeldinger" on public.tilbakemeldinger;
create policy "Brukere kan sende tilbakemeldinger" on public.tilbakemeldinger
for insert to authenticated with check (auth.uid() = user_id);
