create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  category text not null check (
    category in ('tops', 'bottoms', 'outerwear', 'shoes', 'other')
  ),
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.items alter column image_url drop not null;

create index if not exists items_user_created_at_idx
  on public.items (user_id, created_at desc);

alter table public.items enable row level security;

drop policy if exists "Users can read their own items" on public.items;
create policy "Users can read their own items"
  on public.items for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own items" on public.items;
create policy "Users can insert their own items"
  on public.items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own items" on public.items;
create policy "Users can update their own items"
  on public.items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own items" on public.items;
create policy "Users can delete their own items"
  on public.items for delete
  to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'item-images',
  'item-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can list their own item images" on storage.objects;
create policy "Users can list their own item images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can upload their own item images" on storage.objects;
create policy "Users can upload their own item images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can update their own item images" on storage.objects;
create policy "Users can update their own item images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can delete their own item images" on storage.objects;
create policy "Users can delete their own item images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
