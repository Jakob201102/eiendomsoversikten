-- Additivt oppsett for sikker deling av private boliger.
-- Ingen eksisterende tabeller eller data slettes.

create table if not exists public.boligmedlemmer (
  id uuid primary key default gen_random_uuid(),
  bolig_id uuid not null references public.boliger(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rolle text not null check (rolle in ('redigerer','leser')),
  opprettet_at timestamptz not null default now(),
  unique (bolig_id, user_id)
);

create table if not exists public.boliginvitasjoner (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  bolig_id uuid not null references public.boliger(id) on delete cascade,
  invitert_av uuid not null references auth.users(id) on delete cascade,
  epost text not null,
  rolle text not null check (rolle in ('redigerer','leser')),
  status text not null default 'venter' check (status in ('venter','akseptert','kansellert')),
  utloper_at timestamptz not null default (now() + interval '14 days'),
  opprettet_at timestamptz not null default now()
);

alter table public.boligmedlemmer enable row level security;
alter table public.boliginvitasjoner enable row level security;

create or replace function public.er_boligeier(p_bolig_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.boliger b where b.id=p_bolig_id and b.user_id=auth.uid()) $$;

create or replace function public.kan_se_bolig(p_bolig_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select public.er_boligeier(p_bolig_id) or exists(select 1 from public.boligmedlemmer m where m.bolig_id=p_bolig_id and m.user_id=auth.uid()) $$;

create or replace function public.kan_redigere_bolig(p_bolig_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select public.er_boligeier(p_bolig_id) or exists(select 1 from public.boligmedlemmer m where m.bolig_id=p_bolig_id and m.user_id=auth.uid() and m.rolle='redigerer') $$;

revoke all on function public.er_boligeier(uuid) from public;
revoke all on function public.kan_se_bolig(uuid) from public;
revoke all on function public.kan_redigere_bolig(uuid) from public;
grant execute on function public.er_boligeier(uuid), public.kan_se_bolig(uuid), public.kan_redigere_bolig(uuid) to authenticated;

drop policy if exists "Medlemmer kan se medlemskap" on public.boligmedlemmer;
create policy "Medlemmer kan se medlemskap" on public.boligmedlemmer for select to authenticated
using (user_id=auth.uid() or public.er_boligeier(bolig_id));
drop policy if exists "Eiere administrerer medlemmer" on public.boligmedlemmer;
create policy "Eiere administrerer medlemmer" on public.boligmedlemmer for all to authenticated
using (public.er_boligeier(bolig_id)) with check (public.er_boligeier(bolig_id));
drop policy if exists "Eiere administrerer invitasjoner" on public.boliginvitasjoner;
create policy "Eiere administrerer invitasjoner" on public.boliginvitasjoner for all to authenticated
using (public.er_boligeier(bolig_id)) with check (public.er_boligeier(bolig_id));

drop policy if exists "Delte brukere kan se bolig" on public.boliger;
create policy "Delte brukere kan se bolig" on public.boliger for select to authenticated using (public.kan_se_bolig(id));
drop policy if exists "Redigerere kan oppdatere bolig" on public.boliger;
create policy "Redigerere kan oppdatere bolig" on public.boliger for update to authenticated using (public.kan_redigere_bolig(id)) with check (public.kan_redigere_bolig(id));

drop policy if exists "Delte brukere kan se vedlikehold" on public.vedlikeholdsoppgaver;
create policy "Delte brukere kan se vedlikehold" on public.vedlikeholdsoppgaver for select to authenticated using (bolig_id is not null and public.kan_se_bolig(bolig_id));
drop policy if exists "Redigerere administrerer vedlikehold" on public.vedlikeholdsoppgaver;
create policy "Redigerere administrerer vedlikehold" on public.vedlikeholdsoppgaver for all to authenticated using (bolig_id is not null and public.kan_redigere_bolig(bolig_id)) with check (bolig_id is not null and public.kan_redigere_bolig(bolig_id));

drop policy if exists "Delte brukere kan se dokumenter" on public.dokumenter;
create policy "Delte brukere kan se dokumenter" on public.dokumenter for select to authenticated using (bolig_id is not null and public.kan_se_bolig(bolig_id));
drop policy if exists "Redigerere administrerer dokumenter" on public.dokumenter;
create policy "Redigerere administrerer dokumenter" on public.dokumenter for all to authenticated using (bolig_id is not null and public.kan_redigere_bolig(bolig_id)) with check (bolig_id is not null and public.kan_redigere_bolig(bolig_id));

drop policy if exists "Delte brukere kan se kalender" on public.kalenderhendelser;
create policy "Delte brukere kan se kalender" on public.kalenderhendelser for select to authenticated using (bolig_id is not null and public.kan_se_bolig(bolig_id));
drop policy if exists "Redigerere administrerer kalender" on public.kalenderhendelser;
create policy "Redigerere administrerer kalender" on public.kalenderhendelser for all to authenticated using (bolig_id is not null and public.kan_redigere_bolig(bolig_id)) with check (bolig_id is not null and public.kan_redigere_bolig(bolig_id));

drop policy if exists "Delte brukere kan lese boligfiler" on storage.objects;
create policy "Delte brukere kan lese boligfiler" on storage.objects for select to authenticated using (
  bucket_id='dokumentarkiv' and exists(select 1 from public.dokumenter d where d.filsti=name and public.kan_se_bolig(d.bolig_id))
);
drop policy if exists "Redigerere kan slette boligfiler" on storage.objects;
create policy "Redigerere kan slette boligfiler" on storage.objects for delete to authenticated using (
  bucket_id='dokumentarkiv' and exists(select 1 from public.dokumenter d where d.filsti=name and public.kan_redigere_bolig(d.bolig_id))
);

create or replace function public.opprett_boliginvitasjon(p_bolig_id uuid, p_epost text, p_rolle text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_token uuid;
begin
  if not public.er_boligeier(p_bolig_id) then raise exception 'Bare eieren kan invitere medlemmer'; end if;
  if p_rolle not in ('redigerer','leser') then raise exception 'Ugyldig tilgangsnivå'; end if;
  update public.boliginvitasjoner set status='kansellert' where bolig_id=p_bolig_id and lower(epost)=lower(trim(p_epost)) and status='venter';
  insert into public.boliginvitasjoner(bolig_id,invitert_av,epost,rolle) values(p_bolig_id,auth.uid(),lower(trim(p_epost)),p_rolle) returning token into v_token;
  return v_token;
end; $$;

create or replace function public.hent_boligmedlemmer(p_bolig_id uuid)
returns table(user_id uuid, epost text, navn text, rolle text, er_eier boolean)
language plpgsql security definer set search_path=public as $$
begin
  if not public.kan_se_bolig(p_bolig_id) then raise exception 'Ingen tilgang'; end if;
  return query
    select b.user_id, coalesce(u.email,''), coalesce(u.raw_user_meta_data->>'navn',split_part(coalesce(u.email,''),'@',1)), 'eier'::text, true
    from public.boliger b join auth.users u on u.id=b.user_id where b.id=p_bolig_id
    union all
    select m.user_id, coalesce(u.email,''), coalesce(u.raw_user_meta_data->>'navn',split_part(coalesce(u.email,''),'@',1)), m.rolle, false
    from public.boligmedlemmer m join auth.users u on u.id=m.user_id where m.bolig_id=p_bolig_id;
end; $$;

create or replace function public.hent_hjeminvitasjon(p_token uuid)
returns table(adresse text, rolle text, utloper_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare v public.boliginvitasjoner;
begin
  if auth.uid() is null then raise exception 'Du må logge inn'; end if;
  select * into v from public.boliginvitasjoner where token=p_token;
  if v.id is null or v.status<>'venter' or v.utloper_at<now() then return; end if;
  if lower(coalesce(auth.jwt()->>'email',''))<>lower(v.epost) then raise exception 'Invitasjonen er sendt til en annen e-postadresse'; end if;
  return query select coalesce(b.data->>'adresse','Privat bolig'),v.rolle,v.utloper_at from public.boliger b where b.id=v.bolig_id;
end; $$;

create or replace function public.aksepter_hjeminvitasjon(p_token uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v public.boliginvitasjoner;
begin
  if auth.uid() is null then raise exception 'Du må logge inn'; end if;
  select * into v from public.boliginvitasjoner where token=p_token for update;
  if v.id is null or v.status<>'venter' or v.utloper_at<now() then raise exception 'Invitasjonen er ugyldig eller utløpt'; end if;
  if lower(coalesce(auth.jwt()->>'email',''))<>lower(v.epost) then raise exception 'Invitasjonen er sendt til en annen e-postadresse'; end if;
  insert into public.boligmedlemmer(bolig_id,user_id,rolle) values(v.bolig_id,auth.uid(),v.rolle) on conflict(bolig_id,user_id) do update set rolle=excluded.rolle;
  update public.boliginvitasjoner set status='akseptert' where id=v.id;
  return v.bolig_id;
end; $$;

create or replace function public.endre_boligmedlem(p_bolig_id uuid, p_user_id uuid, p_rolle text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.er_boligeier(p_bolig_id) then raise exception 'Bare eieren kan endre tilgang'; end if;
  if p_rolle not in ('redigerer','leser') then raise exception 'Ugyldig tilgangsnivå'; end if;
  update public.boligmedlemmer set rolle=p_rolle where bolig_id=p_bolig_id and user_id=p_user_id;
end; $$;

create or replace function public.fjern_boligmedlem(p_bolig_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.er_boligeier(p_bolig_id) and auth.uid()<>p_user_id then raise exception 'Ingen tilgang'; end if;
  delete from public.boligmedlemmer where bolig_id=p_bolig_id and user_id=p_user_id;
end; $$;

revoke all on function public.opprett_boliginvitasjon(uuid,text,text), public.hent_boligmedlemmer(uuid), public.hent_hjeminvitasjon(uuid), public.aksepter_hjeminvitasjon(uuid), public.endre_boligmedlem(uuid,uuid,text), public.fjern_boligmedlem(uuid,uuid) from public;
grant execute on function public.opprett_boliginvitasjon(uuid,text,text), public.hent_boligmedlemmer(uuid), public.hent_hjeminvitasjon(uuid), public.aksepter_hjeminvitasjon(uuid), public.endre_boligmedlem(uuid,uuid,text), public.fjern_boligmedlem(uuid,uuid) to authenticated;
