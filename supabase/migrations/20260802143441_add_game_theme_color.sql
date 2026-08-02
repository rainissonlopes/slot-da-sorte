alter table public.games
  add column if not exists theme_color text default null;

grant select on table public.games to anon, authenticated;
grant update (theme_color) on table public.games to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'games'
      and policyname = 'Authenticated users can update game theme color'
  ) then
    create policy "Authenticated users can update game theme color"
      on public.games
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end
$$;
