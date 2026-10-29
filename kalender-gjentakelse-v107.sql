begin;
alter table public.kalenderhendelser add column if not exists tillegg jsonb not null default '{}'::jsonb;
notify pgrst, 'reload schema';
commit;
