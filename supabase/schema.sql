create table if not exists public.shared_places (
  id text primary key,
  created_at bigint not null,
  updated_at bigint not null,
  payload jsonb not null,
  inserted_at timestamptz not null default timezone('utc', now())
);

alter table public.shared_places enable row level security;

drop policy if exists "Anyone can read shared places" on public.shared_places;
create policy "Anyone can read shared places"
  on public.shared_places
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can insert shared places" on public.shared_places;
create policy "Anyone can insert shared places"
  on public.shared_places
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anyone can update shared places" on public.shared_places;
create policy "Anyone can update shared places"
  on public.shared_places
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Anyone can delete shared places" on public.shared_places;
create policy "Anyone can delete shared places"
  on public.shared_places
  for delete
  to anon, authenticated
  using (true);
