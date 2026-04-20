-- Learn platform schema: courses, chapters, progress, certificates

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  module text not null default 'prospecting',
  is_pro boolean not null default false,
  chapter_count integer not null default 0,
  cover_emoji text default '📚',
  created_at timestamptz default now()
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade not null,
  position integer not null,
  title text not null,
  content jsonb not null default '[]',
  quiz jsonb not null default '[]',
  created_at timestamptz default now(),
  unique(course_id, position)
);

create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  chapter_id uuid references public.chapters(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  completed_at timestamptz default now(),
  quiz_score integer,
  unique(user_id, chapter_id)
);

create table if not exists public.user_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  issued_at timestamptz default now(),
  unique(user_id, course_id)
);

-- RLS
alter table public.courses enable row level security;
alter table public.chapters enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_certificates enable row level security;

create policy "Courses readable by all" on public.courses
  for select to anon, authenticated using (true);

create policy "Chapters readable by all" on public.chapters
  for select to anon, authenticated using (true);

create policy "Users manage own progress" on public.user_progress
  for all to authenticated using (auth.uid() = user_id);

create policy "Users manage own certificates" on public.user_certificates
  for all to authenticated using (auth.uid() = user_id);
