-- Only new subscription settings. Existing property data/access is unchanged.
begin;
create table if not exists public.kalenderabonnement_v105 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text unique check (token_hash is null or token_hash ~ '^[a-f0-9]{64}$'),
  aktiv boolean not null default false,
  valg jsonb not null default '{"vedlikehold":true,"garantier":true,"avtaler":true,"varseldager":null}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.kalenderabonnement_v105 enable row level security;
revoke all on public.kalenderabonnement_v105 from public, anon, authenticated;
grant select, insert, update, delete on public.kalenderabonnement_v105 to service_role;
notify pgrst, 'reload schema';
commit;
