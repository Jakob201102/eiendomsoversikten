-- Digital boligoverlevering v79. Kjør hele filen i Supabase SQL Editor.
-- Additivt oppsett: eksisterende boliger og gamle invitasjoner endres ikke.
begin;
create table if not exists public.boligoverforinger_v79 (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  selger_id uuid not null references auth.users(id) on delete cascade,
  bolig_id uuid not null references public.boliger(id) on delete cascade,
  mottaker_epost text not null check (mottaker_epost = lower(trim(mottaker_epost))),
  request_id uuid not null,
  pakke jsonb not null,
  valg jsonb not null default '{}'::jsonb,
  opprettet_at timestamptz not null default now(),
  utloper_at timestamptz not null default (now() + interval '30 days'),
  epost_sendt_at timestamptz,
  akseptert_at timestamptz,
  mottaker_id uuid references auth.users(id) on delete set null,
  ny_bolig_id uuid references public.boliger(id) on delete set null,
  unique (selger_id, request_id)
);
alter table public.boligoverforinger_v79 enable row level security;
revoke all on public.boligoverforinger_v79 from public, anon, authenticated;
grant all on public.boligoverforinger_v79 to service_role;

create or replace function public.fullfor_boligoverforing_v79(p_token uuid, p_mottaker uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  inv public.boligoverforinger_v79%rowtype;
  ny_bolig uuid;
  doc jsonb;
  oppgave jsonb;
  sti text;
begin
  -- Only the authenticated server endpoint can call this function.
  select * into inv from public.boligoverforinger_v79 where token = p_token for update;
  if not found then raise exception 'Invitasjonen er ugyldig.'; end if;
  if not exists(select 1 from auth.users u where u.id = p_mottaker and u.email_confirmed_at is not null and lower(u.email) = inv.mottaker_epost) then
    raise exception 'Logg inn med den bekreftede e-postadressen invitasjonen ble sendt til.';
  end if;
  if p_mottaker = inv.selger_id then raise exception 'Boligen må overføres til en annen eier.'; end if;
  if inv.akseptert_at is not null then
    if inv.mottaker_id = p_mottaker and inv.ny_bolig_id is not null then return inv.ny_bolig_id; end if;
    raise exception 'Denne overføringen er allerede fullført.';
  end if;
  if inv.utloper_at <= now() then raise exception 'Invitasjonen er utløpt.'; end if;
  if not exists(select 1 from public.boliger b where b.id = inv.bolig_id and b.user_id = inv.selger_id) then raise exception 'Avsenderen eier ikke lenger boligmappen.'; end if;

  -- Verify all bytes before creating any property or archive records.
  for doc in select value from jsonb_array_elements(inv.pakke->'dokumenter') loop
    if coalesce(doc->>'filsti','') <> '' then
      sti := p_mottaker::text || '/overforing-' || inv.id::text || '/' || (doc->>'nyId');
      if not exists(select 1 from storage.objects o where o.bucket_id = 'dokumentarkiv' and o.name = sti) then raise exception 'En valgt fil mangler. Prøv å motta boligen på nytt.'; end if;
    end if;
  end loop;

  insert into public.boliger(user_id, data) values (p_mottaker, inv.pakke->'bolig') returning id into ny_bolig;
  for doc in select value from jsonb_array_elements(inv.pakke->'dokumenter') loop
    sti := case when coalesce(doc->>'filsti','') = '' then '' else p_mottaker::text || '/overforing-' || inv.id::text || '/' || (doc->>'nyId') end;
    insert into public.dokumenter(id, user_id, bolig_id, navn, kategori, ar, dokumentdato, notat, filsti, filnavn, filtype, filstorrelse)
    values ((doc->>'nyId')::uuid, p_mottaker, ny_bolig, doc->>'navn', doc->>'kategori', (doc->>'ar')::integer, nullif(doc->>'dokumentdato','')::date, doc->>'notat', sti, doc->>'filnavn', doc->>'filtype', coalesce((doc->>'filstorrelse')::bigint, 0));
  end loop;
  for oppgave in select value from jsonb_array_elements(inv.pakke->'vedlikehold') loop
    insert into public.vedlikeholdsoppgaver(id, user_id, bolig_id, data) values ((oppgave->>'id')::uuid, p_mottaker, ny_bolig, oppgave->'data');
  end loop;
  update public.boligoverforinger_v79 set akseptert_at = now(), mottaker_id = p_mottaker, ny_bolig_id = ny_bolig where id = inv.id;
  return ny_bolig;
end $$;
revoke all on function public.fullfor_boligoverforing_v79(uuid, uuid) from public, anon, authenticated;
grant execute on function public.fullfor_boligoverforing_v79(uuid, uuid) to service_role;

-- Copies belong to the recipient's own archive; access does not depend on
-- the seller retaining their account, property or original file.
drop policy if exists "Les egne overforte filer v79" on storage.objects;
create policy "Les egne overforte filer v79" on storage.objects for select to authenticated
using (bucket_id = 'dokumentarkiv' and exists (
  select 1 from public.dokumenter d where d.user_id = auth.uid() and d.filsti = name
));
drop policy if exists "Slett egne overforte filer v79" on storage.objects;
create policy "Slett egne overforte filer v79" on storage.objects for delete to authenticated
using (bucket_id = 'dokumentarkiv' and name like auth.uid()::text || '/overforing-%' and exists (
  select 1 from public.dokumenter d where d.user_id = auth.uid() and d.filsti = name
));
notify pgrst, 'reload schema';
commit;
