create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.teams enable row level security;

create policy "Teams are viewable by authenticated users"
  on public.teams for select
  to authenticated
  using (true);

create policy "Only admins or managers can insert teams"
  on public.teams for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

create policy "Only admins or managers can update teams"
  on public.teams for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

create policy "Only admins or managers can delete teams"
  on public.teams for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

alter table public.profiles
  add column if not exists team_id uuid references public.teams(id) on delete set null;

alter table public.goals
  add column if not exists team_id uuid references public.teams(id) on delete set null;

create index if not exists idx_profiles_team_id on public.profiles(team_id);
create index if not exists idx_goals_team_id on public.goals(team_id);

