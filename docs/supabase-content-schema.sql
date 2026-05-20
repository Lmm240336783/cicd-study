create extension if not exists pgcrypto;

create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  image_url text not null,
  tags text[] not null default '{}',
  is_featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.image_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year integer not null,
  country text not null,
  genres text[] not null default '{}',
  rating numeric not null default 0,
  poster_url text not null default '',
  summary text not null default '',
  recommend_reason text not null default '',
  is_featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists images_set_updated_at on public.images;
create trigger images_set_updated_at
  before update on public.images
  for each row
  execute function public.set_updated_at();

drop trigger if exists image_tags_set_updated_at on public.image_tags;
create trigger image_tags_set_updated_at
  before update on public.image_tags
  for each row
  execute function public.set_updated_at();

drop trigger if exists shows_set_updated_at on public.shows;
create trigger shows_set_updated_at
  before update on public.shows
  for each row
  execute function public.set_updated_at();

create index if not exists images_status_updated_at_idx on public.images (status, updated_at desc);
create index if not exists images_featured_updated_at_idx on public.images (is_featured, updated_at desc);
create index if not exists image_tags_updated_at_idx on public.image_tags (updated_at desc);
create index if not exists shows_status_updated_at_idx on public.shows (status, updated_at desc);
create index if not exists shows_featured_updated_at_idx on public.shows (is_featured, updated_at desc);
