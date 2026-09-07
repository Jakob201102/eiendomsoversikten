create table if not exists public.boligoverforinger (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  selger_id uuid not null references auth.users(id) on delete cascade,
  bolig_id uuid references public.boliger(id) on delete set null,
  mottaker_epost text not null,
  pakke jsonb not null default '{}'::jsonb,
  status text not null default 'venter' check (status in ('venter','akseptert','kansellert')),
  opprettet_at timestamptz not null default now(),
  utloper_at timestamptz not null default (now() + interval '30 days'),
  akseptert_at timestamptz,
  mottaker_id uuid references auth.users(id) on delete set null
);

alter table public.boligoverforinger enable row level security;
grant select, insert, update on public.boligoverforinger to authenticated;
drop policy if exists "Selger kan se overforinger" on public.boligoverforinger;
create policy "Selger kan se overforinger" on public.boligoverforinger for select using (auth.uid() = selger_id);
drop policy if exists "Selger kan opprette overforinger" on public.boligoverforinger;
create policy "Selger kan opprette overforinger" on public.boligoverforinger for insert with check (auth.uid() = selger_id);
drop policy if exists "Selger kan oppdatere overforinger" on public.boligoverforinger;
create policy "Selger kan oppdatere overforinger" on public.boligoverforinger for update using (auth.uid() = selger_id);

create or replace function public.hent_boligoverforing(p_token uuid)
returns table(adresse text, boligtype text, selger_navn text, status text, utloper_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v public.boligoverforinger;
begin
  if auth.uid() is null then raise exception 'Du må logge inn'; end if;
  select * into v from public.boligoverforinger where token=p_token;
  if v.id is null or v.status <> 'venter' or v.utloper_at < now() then return; end if;
  if lower(coalesce(auth.jwt()->>'email','')) <> lower(v.mottaker_epost) then raise exception 'Invitasjonen er sendt til en annen e-postadresse'; end if;
  return query select v.pakke->'bolig'->>'adresse', v.pakke->'bolig'->>'boligtype', coalesce((select raw_user_meta_data->>'navn' from auth.users where id=v.selger_id),'Tidligere eier'), v.status, v.utloper_at;
end; $$;

create or replace function public.aksepter_boligoverforing(p_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v public.boligoverforinger; ny_bolig uuid; dok_id text;
begin
  if auth.uid() is null then raise exception 'Du må logge inn'; end if;
  select * into v from public.boligoverforinger where token=p_token for update;
  if v.id is null or v.status <> 'venter' or v.utloper_at < now() then raise exception 'Invitasjonen er ugyldig eller utløpt'; end if;
  if lower(coalesce(auth.jwt()->>'email','')) <> lower(v.mottaker_epost) then raise exception 'Invitasjonen er sendt til en annen e-postadresse'; end if;
  insert into public.boliger(user_id,data) values(auth.uid(),v.pakke->'bolig') returning id into ny_bolig;
  for dok_id in select jsonb_array_elements_text(coalesce(v.pakke->'dokumentIder','[]'::jsonb)) loop
    update public.dokumenter set user_id=auth.uid(), bolig_id=ny_bolig where id::text=dok_id and user_id=v.selger_id;
  end loop;
  update public.boligoverforinger set status='akseptert',akseptert_at=now(),mottaker_id=auth.uid() where id=v.id;
  return ny_bolig;
end; $$;

revoke all on function public.hent_boligoverforing(uuid) from public;
revoke all on function public.aksepter_boligoverforing(uuid) from public;
grant execute on function public.hent_boligoverforing(uuid) to authenticated;
grant execute on function public.aksepter_boligoverforing(uuid) to authenticated;

drop policy if exists "Dokumenteier kan lese overfort fil" on storage.objects;
create policy "Dokumenteier kan lese overfort fil" on storage.objects for select to authenticated using (
  bucket_id='dokumentarkiv' and exists(select 1 from public.dokumenter d where d.filsti=name and d.user_id=auth.uid())
);
drop policy if exists "Dokumenteier kan slette overfort fil" on storage.objects;
create policy "Dokumenteier kan slette overfort fil" on storage.objects for delete to authenticated using (
  bucket_id='dokumentarkiv' and exists(select 1 from public.dokumenter d where d.filsti=name and d.user_id=auth.uid())
);
