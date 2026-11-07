create table if not exists public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default current_date,
  memo text check (memo is null or char_length(memo) <= 2000),
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists outfits_user_date_idx
  on public.outfits (user_id, date desc);

alter table public.outfits enable row level security;

drop policy if exists "Users can read their own outfits" on public.outfits;
create policy "Users can read their own outfits"
  on public.outfits for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own outfits" on public.outfits;
create policy "Users can insert their own outfits"
  on public.outfits for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own outfits" on public.outfits;
create policy "Users can update their own outfits"
  on public.outfits for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own outfits" on public.outfits;
create policy "Users can delete their own outfits"
  on public.outfits for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.outfit_items (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (outfit_id, item_id)
);

create index if not exists outfit_items_item_id_idx
  on public.outfit_items (item_id);

alter table public.outfit_items enable row level security;

drop policy if exists "Users can read their own outfit items" on public.outfit_items;
create policy "Users can read their own outfit items"
  on public.outfit_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.outfits
      where outfits.id = outfit_items.outfit_id
        and outfits.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can add items to their own outfits" on public.outfit_items;
create policy "Users can add items to their own outfits"
  on public.outfit_items for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.outfits
      join public.items on items.id = outfit_items.item_id
      where outfits.id = outfit_items.outfit_id
        and outfits.user_id = (select auth.uid())
        and items.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can remove items from their own outfits" on public.outfit_items;
create policy "Users can remove items from their own outfits"
  on public.outfit_items for delete
  to authenticated
  using (
    exists (
      select 1
      from public.outfits
      where outfits.id = outfit_items.outfit_id
        and outfits.user_id = (select auth.uid())
    )
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'outfit-images',
  'outfit-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their own outfit images" on storage.objects;
create policy "Users can upload their own outfit images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'outfit-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can delete their own outfit images" on storage.objects;
create policy "Users can delete their own outfit images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'outfit-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
