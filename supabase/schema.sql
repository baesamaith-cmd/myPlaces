create table if not exists public.places (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  created_at bigint not null,
  updated_at bigint not null,
  payload jsonb not null,
  inserted_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, id)
);

alter table public.places enable row level security;

drop policy if exists "Users can read own places" on public.places;
create policy "Users can read own places"
  on public.places
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own places" on public.places;
create policy "Users can insert own places"
  on public.places
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own places" on public.places;
create policy "Users can update own places"
  on public.places
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own places" on public.places;
create policy "Users can delete own places"
  on public.places
  for delete
  to authenticated
  using (auth.uid() = user_id);
