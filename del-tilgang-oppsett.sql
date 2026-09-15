-- Deling av private hjem. Additivt oppsett: sletter ingen brukerdata.
create extension if not exists pgcrypto;

create table if not exists public.boligmedlemmer (
  bolig_id uuid not null references public.boliger(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rolle text not null default 'leser' check (rolle in ('leser', 'redigerer')),
  created_at timestamptz not null default now(),
  primary key (bolig_id, user_id)
);

create table if not exists public.boliginvitasjoner (
  id uuid primary key default gen_random_uuid(),
  bolig_id uuid not null references public.boliger(id) on delete cascade,
  epost text not null,
  rolle text not null default 'leser' check (rolle in ('leser', 'redigerer')),
  token uuid not null default gen_random_uuid() unique,
  opprettet_av uuid not null references auth.users(id) on delete cascade,
  opprettet_at timestamptz not null default now(),
  utloper_at timestamptz not null default (now() + interval '7 days'),
  akseptert_at timestamptz
);

create index if not exists boligmedlemmer_user_id_idx on public.boligmedlemmer(user_id);
create index if not exists boliginvitasjoner_token_idx on public.boliginvitasjoner(token);
create index if not exists boliginvitasjoner_epost_idx on public.boliginvitasjoner(lower(epost));

alter table public.boligmedlemmer enable row level security;
alter table public.boliginvitasjoner enable row level security;

create or replace function public.er_boligeier(p_bolig_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.boliger b where b.id = p_bolig_id and b.user_id = auth.uid()) $$;

create or replace function public.har_boligtilgang(p_bolig_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.er_boligeier(p_bolig_id) or exists(select 1 from public.boligmedlemmer m where m.bolig_id = p_bolig_id and m.user_id = auth.uid()) $$;

create or replace function public.kan_redigere_bolig(p_bolig_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.er_boligeier(p_bolig_id) or exists(select 1 from public.boligmedlemmer m where m.bolig_id = p_bolig_id and m.user_id = auth.uid() and m.rolle = 'redigerer') $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='boliger' and policyname='Delte hjem kan leses') then
    create policy "Delte hjem kan leses" on public.boliger for select to authenticated using (public.har_boligtilgang(id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='boliger' and policyname='Delte hjem kan redigeres') then
    create policy "Delte hjem kan redigeres" on public.boliger for update to authenticated using (public.kan_redigere_bolig(id)) with check (public.kan_redigere_bolig(id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='boligmedlemmer' and policyname='Medlemmer kan se medlemskap') then
    create policy "Medlemmer kan se medlemskap" on public.boligmedlemmer for select to authenticated using (public.har_boligtilgang(bolig_id));
  end if;
end $$;

-- Gi delte brukere samme tilgang til boligtilknyttet innhold. Policyene
-- opprettes bare når tabellen finnes, og kommer i tillegg til dagens policyer.
do $$
declare t text;
begin
  foreach t in array array['dokumenter','vedlikeholdsoppgaver','kalenderhendelser'] loop
    if to_regclass('public.' || t) is not null then
      if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='Delte hjem kan lese') then
        execute format('create policy "Delte hjem kan lese" on public.%I for select to authenticated using (bolig_id is not null and public.har_boligtilgang(bolig_id))', t);
      end if;
      if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='Delte hjem kan opprette') then
        execute format('create policy "Delte hjem kan opprette" on public.%I for insert to authenticated with check (bolig_id is not null and public.kan_redigere_bolig(bolig_id))', t);
      end if;
      if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='Delte hjem kan endre') then
        execute format('create policy "Delte hjem kan endre" on public.%I for update to authenticated using (bolig_id is not null and public.kan_redigere_bolig(bolig_id)) with check (bolig_id is not null and public.kan_redigere_bolig(bolig_id))', t);
      end if;
      if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='Delte hjem kan slette') then
        execute format('create policy "Delte hjem kan slette" on public.%I for delete to authenticated using (bolig_id is not null and public.kan_redigere_bolig(bolig_id))', t);
      end if;
    end if;
  end loop;
end $$;

create or replace function public.hent_boligmedlemmer(p_bolig_id uuid)
returns table(user_id uuid, epost text, navn text, rolle text, er_eier boolean)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.har_boligtilgang(p_bolig_id) then raise exception 'Ingen tilgang til boligen'; end if;
  return query
    select b.user_id, coalesce(u.email,''), coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(coalesce(u.email,''),'@',1)), 'eier'::text, true
    from public.boliger b join auth.users u on u.id=b.user_id where b.id=p_bolig_id
    union all
    select m.user_id, coalesce(u.email,''), coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(coalesce(u.email,''),'@',1)), m.rolle, false
    from public.boligmedlemmer m join auth.users u on u.id=m.user_id where m.bolig_id=p_bolig_id;
end $$;

create or replace function public.opprett_boliginvitasjon(p_bolig_id uuid, p_epost text, p_rolle text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_token uuid;
begin
  if not public.er_boligeier(p_bolig_id) then raise exception 'Bare eieren kan invitere'; end if;
  if p_rolle not in ('leser','redigerer') then raise exception 'Ugyldig tilgangsnivå'; end if;
  if trim(coalesce(p_epost,'')) = '' then raise exception 'E-post mangler'; end if;
  delete from public.boliginvitasjoner where bolig_id=p_bolig_id and lower(epost)=lower(trim(p_epost)) and akseptert_at is null;
  insert into public.boliginvitasjoner(bolig_id, epost, rolle, opprettet_av)
  values(p_bolig_id, lower(trim(p_epost)), p_rolle, auth.uid()) returning token into v_token;
  return v_token;
end $$;

create or replace function public.hent_hjeminvitasjon(p_token text)
returns table(adresse text, rolle text, utloper_at timestamptz)
language sql security definer set search_path = public
as $$
  select coalesce(b.data->>'adresse','Privat bolig'), i.rolle, i.utloper_at
  from public.boliginvitasjoner i join public.boliger b on b.id=i.bolig_id
  where i.token::text=p_token and i.akseptert_at is null and i.utloper_at>now()
    and lower(i.epost)=lower(coalesce(auth.jwt()->>'email',''))
$$;

create or replace function public.aksepter_hjeminvitasjon(p_token text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_inv public.boliginvitasjoner%rowtype;
begin
  select * into v_inv from public.boliginvitasjoner where token::text=p_token and akseptert_at is null and utloper_at>now();
  if v_inv.id is null then raise exception 'Invitasjonen er ugyldig eller utløpt'; end if;
  if lower(v_inv.epost)<>lower(coalesce(auth.jwt()->>'email','')) then raise exception 'Logg inn med e-postadressen invitasjonen ble sendt til'; end if;
  insert into public.boligmedlemmer(bolig_id,user_id,rolle) values(v_inv.bolig_id,auth.uid(),v_inv.rolle)
    on conflict(bolig_id,user_id) do update set rolle=excluded.rolle;
  update public.boliginvitasjoner set akseptert_at=now() where id=v_inv.id;
  return v_inv.bolig_id;
end $$;

create or replace function public.endre_boligmedlem(p_bolig_id uuid, p_user_id uuid, p_rolle text)
returns void language plpgsql security definer set search_path = public
as $$ begin
  if not public.er_boligeier(p_bolig_id) then raise exception 'Bare eieren kan endre tilgang'; end if;
  if p_rolle not in ('leser','redigerer') then raise exception 'Ugyldig tilgangsnivå'; end if;
  update public.boligmedlemmer set rolle=p_rolle where bolig_id=p_bolig_id and user_id=p_user_id;
end $$;

create or replace function public.fjern_boligmedlem(p_bolig_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public
as $$ begin
  if not public.er_boligeier(p_bolig_id) then raise exception 'Bare eieren kan fjerne tilgang'; end if;
  delete from public.boligmedlemmer where bolig_id=p_bolig_id and user_id=p_user_id;
end $$;

grant execute on function public.hent_boligmedlemmer(uuid) to authenticated;
grant execute on function public.opprett_boliginvitasjon(uuid,text,text) to authenticated;
grant execute on function public.hent_hjeminvitasjon(text) to authenticated;
grant execute on function public.aksepter_hjeminvitasjon(text) to authenticated;
grant execute on function public.endre_boligmedlem(uuid,uuid,text) to authenticated;
grant execute on function public.fjern_boligmedlem(uuid,uuid) to authenticated;

-- Delte brukere må også kunne åpne selve filen, ikke bare dokumentraden.
-- Eksisterende regler for brukerens egen mappe beholdes uendret.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Brukere kan laste opp boligfiler') then
    create policy "Brukere kan laste opp boligfiler" on storage.objects
      for insert to authenticated
      with check (
        bucket_id='dokumentarkiv'
        and (storage.foldername(name))[1]=auth.uid()::text
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Delte boligfiler kan leses') then
    create policy "Delte boligfiler kan leses" on storage.objects
      for select to authenticated
      using (
        bucket_id='dokumentarkiv'
        and exists (
          select 1 from public.dokumenter d
          where d.filsti=storage.objects.name
            and d.bolig_id is not null
            and public.har_boligtilgang(d.bolig_id)
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Delte boligfiler kan slettes') then
    create policy "Delte boligfiler kan slettes" on storage.objects
      for delete to authenticated
      using (
        bucket_id='dokumentarkiv'
        and exists (
          select 1 from public.dokumenter d
          where d.filsti=storage.objects.name
            and d.bolig_id is not null
            and public.kan_redigere_bolig(d.bolig_id)
        )
      );
  end if;
end $$;
