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

with ranked_outfits as (
  select
    id,
    row_number() over (
      partition by user_id, date
      order by created_at desc, id desc
    ) as duplicate_rank
  from public.outfits
)
delete from public.outfits
using ranked_outfits
where outfits.id = ranked_outfits.id
  and ranked_outfits.duplicate_rank > 1;

create unique index if not exists outfits_user_date_unique_idx
  on public.outfits (user_id, date);

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

create table if not exists public.outfit_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  memo text check (memo is null or char_length(memo) <= 2000),
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists outfit_templates_user_created_idx
  on public.outfit_templates (user_id, created_at desc);

alter table public.outfit_templates enable row level security;

drop policy if exists "Users can read their own outfit templates" on public.outfit_templates;
create policy "Users can read their own outfit templates"
  on public.outfit_templates for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own outfit templates" on public.outfit_templates;
create policy "Users can add their own outfit templates"
  on public.outfit_templates for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own outfit templates" on public.outfit_templates;
create policy "Users can update their own outfit templates"
  on public.outfit_templates for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own outfit templates" on public.outfit_templates;
create policy "Users can delete their own outfit templates"
  on public.outfit_templates for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.outfit_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.outfit_templates (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (template_id, item_id)
);

create index if not exists outfit_template_items_item_id_idx
  on public.outfit_template_items (item_id);

alter table public.outfit_template_items enable row level security;

drop policy if exists "Users can read their own outfit template items" on public.outfit_template_items;
create policy "Users can read their own outfit template items"
  on public.outfit_template_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.outfit_templates
      where outfit_templates.id = outfit_template_items.template_id
        and outfit_templates.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can add items to their own outfit templates" on public.outfit_template_items;
create policy "Users can add items to their own outfit templates"
  on public.outfit_template_items for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.outfit_templates
      join public.items on items.id = outfit_template_items.item_id
      where outfit_templates.id = outfit_template_items.template_id
        and outfit_templates.user_id = (select auth.uid())
        and items.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can remove items from their own outfit templates" on public.outfit_template_items;
create policy "Users can remove items from their own outfit templates"
  on public.outfit_template_items for delete
  to authenticated
  using (
    exists (
      select 1
      from public.outfit_templates
      where outfit_templates.id = outfit_template_items.template_id
        and outfit_templates.user_id = (select auth.uid())
    )
  );

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

create or replace function public.save_outfit(
  p_date date,
  p_memo text,
  p_image_url text,
  p_item_ids uuid[]
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_outfit_id uuid;
begin
  if current_user_id is null then
    raise exception 'ログインが必要です。';
  end if;

  insert into public.outfits (user_id, date, memo, image_url)
  values (current_user_id, p_date, p_memo, p_image_url)
  on conflict (user_id, date) do update
    set memo = excluded.memo,
        image_url = excluded.image_url
  returning id into saved_outfit_id;

  delete from public.outfit_items
  where outfit_id = saved_outfit_id;

  insert into public.outfit_items (outfit_id, item_id)
  select saved_outfit_id, selected.item_id
  from (
    select distinct item_id
    from unnest(coalesce(p_item_ids, '{}'::uuid[])) as selected_items(item_id)
  ) as selected;

  return saved_outfit_id;
end;
$$;

revoke all on function public.save_outfit(date, text, text, uuid[]) from public, anon;
grant execute on function public.save_outfit(date, text, text, uuid[]) to authenticated;

create or replace function public.save_outfit_with_template(
  p_date date,
  p_memo text,
  p_image_url text,
  p_item_ids uuid[],
  p_save_as_template boolean,
  p_template_name text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_outfit_id uuid;
  saved_template_id uuid;
begin
  if current_user_id is null then
    raise exception 'ログインが必要です。';
  end if;

  if coalesce(p_save_as_template, false)
     and (p_template_name is null or char_length(trim(p_template_name)) not between 1 and 80) then
    raise exception 'テンプレート名は1〜80文字で入力してください。';
  end if;

  saved_outfit_id := public.save_outfit(
    p_date,
    p_memo,
    p_image_url,
    p_item_ids
  );

  if coalesce(p_save_as_template, false) then
    insert into public.outfit_templates (user_id, name, memo, image_url)
    select current_user_id, trim(p_template_name), outfits.memo, outfits.image_url
    from public.outfits
    where outfits.id = saved_outfit_id
      and outfits.user_id = current_user_id
    returning id into saved_template_id;

    insert into public.outfit_template_items (template_id, item_id)
    select saved_template_id, outfit_items.item_id
    from public.outfit_items
    where outfit_items.outfit_id = saved_outfit_id;
  end if;

  return saved_outfit_id;
end;
$$;

revoke all on function public.save_outfit_with_template(date, text, text, uuid[], boolean, text) from public, anon;
grant execute on function public.save_outfit_with_template(date, text, text, uuid[], boolean, text) to authenticated;

create or replace function public.save_outfit_template(
  p_outfit_id uuid,
  p_name text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_template_id uuid;
begin
  if current_user_id is null then
    raise exception 'ログインが必要です。';
  end if;

  if p_name is null or char_length(trim(p_name)) not between 1 and 80 then
    raise exception 'テンプレート名は1〜80文字で入力してください。';
  end if;

  insert into public.outfit_templates (user_id, name, memo, image_url)
  select current_user_id, trim(p_name), outfits.memo, outfits.image_url
  from public.outfits
  where outfits.id = p_outfit_id
    and outfits.user_id = current_user_id
  returning id into saved_template_id;

  if saved_template_id is null then
    raise exception 'コーデ記録が見つかりません。';
  end if;

  insert into public.outfit_template_items (template_id, item_id)
  select saved_template_id, outfit_items.item_id
  from public.outfit_items
  where outfit_items.outfit_id = p_outfit_id;

  return saved_template_id;
end;
$$;

revoke all on function public.save_outfit_template(uuid, text) from public, anon;
grant execute on function public.save_outfit_template(uuid, text) to authenticated;

create or replace function public.update_outfit_template(
  p_template_id uuid,
  p_name text,
  p_memo text,
  p_image_url text,
  p_item_ids uuid[]
)
returns void
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'ログインが必要です。';
  end if;

  if p_name is null or char_length(trim(p_name)) not between 1 and 80 then
    raise exception 'テンプレート名は1〜80文字で入力してください。';
  end if;

  if p_memo is not null and char_length(p_memo) > 2000 then
    raise exception 'メモは2000文字以内で入力してください。';
  end if;

  update public.outfit_templates
  set name = trim(p_name),
      memo = p_memo,
      image_url = p_image_url
  where id = p_template_id
    and user_id = current_user_id;

  if not found then
    raise exception 'テンプレートが見つかりません。';
  end if;

  delete from public.outfit_template_items
  where template_id = p_template_id;

  insert into public.outfit_template_items (template_id, item_id)
  select p_template_id, selected.item_id
  from (
    select distinct item_id
    from unnest(coalesce(p_item_ids, '{}'::uuid[])) as selected_items(item_id)
  ) as selected;
end;
$$;

revoke all on function public.update_outfit_template(uuid, text, text, text, uuid[]) from public, anon;
grant execute on function public.update_outfit_template(uuid, text, text, text, uuid[]) to authenticated;

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

drop policy if exists "Users can list their own outfit images" on storage.objects;
create policy "Users can list their own outfit images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'outfit-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

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

create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'ログインが必要です。';
  end if;

  delete from auth.users
  where id = current_user_id;

  if not found then
    raise exception 'アカウントが見つかりません。';
  end if;
end;
$$;

revoke all on function public.delete_current_user() from public, anon;
grant execute on function public.delete_current_user() to authenticated;
