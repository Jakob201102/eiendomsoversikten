create table if not exists public.kalenderhendelser (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tittel text not null,
  type text not null check (type in ('visning', 'mote', 'annet')),
  dato date not null,
  klokkeslett time,
  bolig_id uuid references public.boliger(id) on delete set null,
  leietaker_id uuid references public.leietakere(id) on delete set null,
  notat text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kalenderhendelser enable row level security;

drop policy if exists "Brukere kan se egne kalenderhendelser" on public.kalenderhendelser;
create policy "Brukere kan se egne kalenderhendelser"
on public.kalenderhendelser for select
using (auth.uid() = user_id);

drop policy if exists "Brukere kan opprette egne kalenderhendelser" on public.kalenderhendelser;
create policy "Brukere kan opprette egne kalenderhendelser"
on public.kalenderhendelser for insert
with check (auth.uid() = user_id);

drop policy if exists "Brukere kan oppdatere egne kalenderhendelser" on public.kalenderhendelser;
create policy "Brukere kan oppdatere egne kalenderhendelser"
on public.kalenderhendelser for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Brukere kan slette egne kalenderhendelser" on public.kalenderhendelser;
create policy "Brukere kan slette egne kalenderhendelser"
on public.kalenderhendelser for delete
using (auth.uid() = user_id);

create index if not exists kalenderhendelser_user_dato_idx
on public.kalenderhendelser (user_id, dato);
