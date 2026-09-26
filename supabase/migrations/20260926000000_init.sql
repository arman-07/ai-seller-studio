-- Core schema for ai-seller-studio.
-- Plans and usage are written only by edge functions (service role); users read their own rows.

create type public.plan as enum ('free', 'starter', 'pro');
create type public.marketplace as enum ('etsy', 'ebay', 'vinted', 'shopify');
create type public.product_status as enum ('draft', 'processing', 'ready', 'failed');
create type public.usage_kind as enum ('product', 'ai_scene');

-- Profiles --------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan public.plan not null default 'free',
  plan_source text check (plan_source in ('revenuecat', 'paddle')),
  plan_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Products --------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  marketplace public.marketplace not null,
  seller_note text check (char_length(seller_note) <= 500),
  status public.product_status not null default 'draft',
  title text,
  description text,
  tags text[] not null default '{}',
  category text,
  materials text[] not null default '{}',
  colors text[] not null default '{}',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_user_created_idx on public.products (user_id, created_at desc);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position smallint not null default 0,
  -- Paths inside the `product-images` bucket, always prefixed with "<user_id>/".
  studio_path text not null,       -- white-background photo composed on device
  ai_scene_path text,              -- optional AI studio scene
  created_at timestamptz not null default now(),
  unique (product_id, position)
);

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

-- Usage (for plan limits) -------------------------------------------------------
create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.usage_kind not null,
  product_id uuid references public.products (id) on delete set null,
  created_at timestamptz not null default now()
);
create index usage_events_user_kind_created_idx on public.usage_events (user_id, kind, created_at);

-- RLS -------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.usage_events enable row level security;

create policy "own profile: read" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "own products: all" on public.products
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own images: all" on public.product_images
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.products p where p.id = product_id and p.user_id = (select auth.uid()))
  );

create policy "own usage: read" on public.usage_events
  for select to authenticated using ((select auth.uid()) = user_id);

-- Storage -----------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', false, 10485760, array['image/png', 'image/jpeg', 'image/webp']);

create policy "own folder: read" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "own folder: upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "own folder: delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Waitlist (landing page, anonymous insert only) ---------------------------------
create table public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  marketplace text,
  created_at timestamptz not null default now()
);
alter table public.waitlist enable row level security;
create policy "anyone can join" on public.waitlist for insert to anon, authenticated with check (true);
