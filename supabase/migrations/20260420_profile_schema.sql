-- Favourited minerals
create table if not exists public.user_favourites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  mineral_id text not null,
  mineral_name text,
  created_at timestamptz default now(),
  unique(user_id, mineral_id)
);
alter table public.user_favourites enable row level security;
create policy "Users manage own favourites" on public.user_favourites for all using (auth.uid() = user_id);
