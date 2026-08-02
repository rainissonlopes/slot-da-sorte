alter table public.aparencia
  add column if not exists config_v2 jsonb default '{}'::jsonb;

alter table public.config_site
  add column if not exists config_v2 jsonb default '{}'::jsonb;

alter table public.plataformas
  add column if not exists is_new boolean not null default false;

alter table public.sinais
  add column if not exists destaque boolean not null default false,
  add column if not exists game_id bigint default null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sinais_game_id_fkey'
      and conrelid = 'public.sinais'::regclass
  ) then
    alter table public.sinais
      add constraint sinais_game_id_fkey
      foreign key (game_id)
      references public.games(id)
      on delete set null;
  end if;
end
$$;

create index if not exists sinais_game_id_idx on public.sinais (game_id);
