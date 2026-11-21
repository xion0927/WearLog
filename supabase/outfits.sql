create table if not exists public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default current_date,
  name text,
  memo text check (memo is null or char_length(memo) <= 2000),
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.outfits
  add column if not exists name text;

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

create table if not exists public.outfit_template_wears (
  outfit_id uuid primary key references public.outfits (id) on delete cascade,
  template_id uuid not null references public.outfit_templates (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  wear_month smallint not null,
  created_at timestamptz not null default now()
);

alter table public.outfit_template_wears
  drop constraint if exists outfit_template_wears_wear_month_check;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'outfit_template_wears'
      and column_name = 'wear_month'
      and data_type = 'date'
  ) then
    alter table public.outfit_template_wears
      alter column wear_month type smallint
      using extract(month from wear_month)::smallint;
  end if;
end
$$;

alter table public.outfit_template_wears
  add constraint outfit_template_wears_wear_month_check
  check (wear_month between 1 and 12);

update public.outfits
set name = coalesce(
  (
    select nullif(btrim(outfit_templates.name), '')
    from public.outfit_template_wears
    join public.outfit_templates
      on outfit_templates.id = outfit_template_wears.template_id
    where outfit_template_wears.outfit_id = outfits.id
  ),
  extract(year from outfits.date)::integer::text
    || '年'
    || extract(month from outfits.date)::integer::text
    || '月'
    || extract(day from outfits.date)::integer::text
    || '日のコーデ'
)
where name is null or btrim(name) = '';

with exact_template_matches as (
  select outfits.id as outfit_id, outfit_templates.id as template_id, outfit_templates.name
  from public.outfits
  join public.outfit_templates
    on outfit_templates.user_id = outfits.user_id
  where exists (
    select 1
    from public.outfit_items
    where outfit_items.outfit_id = outfits.id
  )
    and not exists (
      select 1
      from public.outfit_items
      where outfit_items.outfit_id = outfits.id
        and not exists (
          select 1
          from public.outfit_template_items
          where outfit_template_items.template_id = outfit_templates.id
            and outfit_template_items.item_id = outfit_items.item_id
        )
    )
    and not exists (
      select 1
      from public.outfit_template_items
      where outfit_template_items.template_id = outfit_templates.id
        and not exists (
          select 1
          from public.outfit_items
          where outfit_items.outfit_id = outfits.id
            and outfit_items.item_id = outfit_template_items.item_id
        )
    )
),
unique_template_matches as (
  select outfit_id, min(name) as name
  from exact_template_matches
  group by outfit_id
  having count(*) = 1
)
update public.outfits
set name = unique_template_matches.name
from unique_template_matches
where outfits.id = unique_template_matches.outfit_id
  and outfits.name = (
    extract(year from outfits.date)::integer::text
      || '年'
      || extract(month from outfits.date)::integer::text
      || '月'
      || extract(day from outfits.date)::integer::text
      || '日のコーデ'
  );

alter table public.outfits
  alter column name set not null;

alter table public.outfits
  drop constraint if exists outfits_name_check;

alter table public.outfits
  add constraint outfits_name_check
  check (char_length(btrim(name)) between 1 and 80);

create index if not exists outfit_template_wears_template_month_idx
  on public.outfit_template_wears (template_id, wear_month desc);

alter table public.outfit_template_wears enable row level security;

drop policy if exists "Users can read their own template wears" on public.outfit_template_wears;
create policy "Users can read their own template wears"
  on public.outfit_template_wears for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own template wears" on public.outfit_template_wears;
create policy "Users can add their own template wears"
  on public.outfit_template_wears for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.outfits
      join public.outfit_templates
        on outfit_templates.id = outfit_template_wears.template_id
      where outfits.id = outfit_template_wears.outfit_id
        and outfits.user_id = (select auth.uid())
        and outfit_templates.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update their own template wears" on public.outfit_template_wears;
create policy "Users can update their own template wears"
  on public.outfit_template_wears for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.outfits
      join public.outfit_templates
        on outfit_templates.id = outfit_template_wears.template_id
      where outfits.id = outfit_template_wears.outfit_id
        and outfits.user_id = (select auth.uid())
        and outfit_templates.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can remove their own template wears" on public.outfit_template_wears;
create policy "Users can remove their own template wears"
  on public.outfit_template_wears for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.outfit_template_manual_months (
  template_id uuid not null references public.outfit_templates (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  wear_month smallint not null,
  created_at timestamptz not null default now()
);

alter table public.outfit_template_manual_months
  drop constraint if exists outfit_template_manual_months_pkey;
alter table public.outfit_template_manual_months
  drop constraint if exists outfit_template_manual_months_wear_month_check;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'outfit_template_manual_months'
      and column_name = 'wear_month'
      and data_type = 'date'
  ) then
    alter table public.outfit_template_manual_months
      alter column wear_month type smallint
      using extract(month from wear_month)::smallint;
  end if;
end
$$;

delete from public.outfit_template_manual_months older
using public.outfit_template_manual_months newer
where older.template_id = newer.template_id
  and older.wear_month = newer.wear_month
  and older.ctid < newer.ctid;

alter table public.outfit_template_manual_months
  add constraint outfit_template_manual_months_wear_month_check
  check (wear_month between 1 and 12);
alter table public.outfit_template_manual_months
  add constraint outfit_template_manual_months_pkey
  primary key (template_id, wear_month);

alter table public.outfit_template_manual_months enable row level security;

drop policy if exists "Users can read their own manual template months" on public.outfit_template_manual_months;
create policy "Users can read their own manual template months"
  on public.outfit_template_manual_months for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own manual template months" on public.outfit_template_manual_months;
create policy "Users can add their own manual template months"
  on public.outfit_template_manual_months for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.outfit_templates
      where outfit_templates.id = outfit_template_manual_months.template_id
        and outfit_templates.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can remove their own manual template months" on public.outfit_template_manual_months;
create policy "Users can remove their own manual template months"
  on public.outfit_template_manual_months for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop function if exists public.save_outfit_with_template(date, text, text, uuid[], boolean, text, uuid);
drop function if exists public.save_outfit_with_template(date, text, text, uuid[], boolean, text);
drop function if exists public.save_outfit(date, text, text, uuid[]);

create or replace function public.save_outfit(
  p_date date,
  p_name text,
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
  resolved_name text := nullif(btrim(p_name), '');
begin
  if current_user_id is null then
    raise exception 'ログインが必要です。';
  end if;

  if resolved_name is null then
    if nullif(btrim(p_image_url), '') is null
       and cardinality(coalesce(p_item_ids, '{}'::uuid[])) = 0 then
      raise exception 'コーデ名、全体画像、着用した服のいずれかを登録してください。';
    end if;

    resolved_name :=
      extract(year from p_date)::integer::text
        || '年'
        || extract(month from p_date)::integer::text
        || '月'
        || extract(day from p_date)::integer::text
        || '日のコーデ';
  end if;

  if char_length(resolved_name) > 80 then
    raise exception 'コーデ名は80文字以内で入力してください。';
  end if;

  insert into public.outfits (user_id, date, name, memo, image_url)
  values (current_user_id, p_date, resolved_name, p_memo, p_image_url)
  on conflict (user_id, date) do update
    set name = excluded.name,
        memo = excluded.memo,
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

revoke all on function public.save_outfit(date, text, text, text, uuid[]) from public, anon;
grant execute on function public.save_outfit(date, text, text, text, uuid[]) to authenticated;

create or replace function public.save_outfit_with_template(
  p_date date,
  p_name text,
  p_memo text,
  p_image_url text,
  p_item_ids uuid[],
  p_save_as_template boolean,
  p_template_id uuid
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_outfit_id uuid;
  saved_template_id uuid;
  used_template_id uuid;
  resolved_name text := nullif(btrim(p_name), '');
begin
  if current_user_id is null then
    raise exception 'ログインが必要です。';
  end if;

  if p_template_id is not null and coalesce(p_save_as_template, false) then
    raise exception 'テンプレートの使用と新規登録は同時にできません。';
  end if;

  if p_template_id is not null then
    perform 1
    from public.outfit_templates
    where id = p_template_id
      and user_id = current_user_id;

    if not found then
      raise exception 'テンプレートが見つからないか、使用する権限がありません。';
    end if;

    if resolved_name is null then
      select name into resolved_name
      from public.outfit_templates
      where id = p_template_id
        and user_id = current_user_id;
    end if;
  end if;

  if resolved_name is null then
    if nullif(btrim(p_image_url), '') is null
       and cardinality(coalesce(p_item_ids, '{}'::uuid[])) = 0 then
      raise exception 'コーデ名、全体画像、着用した服のいずれかを登録してください。';
    end if;

    resolved_name :=
      extract(year from p_date)::integer::text
        || '年'
        || extract(month from p_date)::integer::text
        || '月'
        || extract(day from p_date)::integer::text
        || '日のコーデ';
  end if;

  if char_length(resolved_name) > 80 then
    raise exception 'コーデ名は80文字以内で入力してください。';
  end if;

  saved_outfit_id := public.save_outfit(
    p_date,
    resolved_name,
    p_memo,
    p_image_url,
    p_item_ids
  );

  if coalesce(p_save_as_template, false) then
    insert into public.outfit_templates (user_id, name, memo, image_url)
    select current_user_id, outfits.name, outfits.memo, outfits.image_url
    from public.outfits
    where outfits.id = saved_outfit_id
      and outfits.user_id = current_user_id
    returning id into saved_template_id;

    insert into public.outfit_template_items (template_id, item_id)
    select saved_template_id, outfit_items.item_id
    from public.outfit_items
    where outfit_items.outfit_id = saved_outfit_id;

    used_template_id := saved_template_id;
  elsif p_template_id is not null then
    used_template_id := p_template_id;
  end if;

  delete from public.outfit_template_wears
  where outfit_id = saved_outfit_id;

  if used_template_id is not null then
    insert into public.outfit_template_wears (
      outfit_id,
      template_id,
      user_id,
      wear_month
    )
    values (
      saved_outfit_id,
      used_template_id,
      current_user_id,
      extract(month from p_date)::smallint
    );
  end if;

  return saved_outfit_id;
end;
$$;

revoke all on function public.save_outfit_with_template(date, text, text, text, uuid[], boolean, uuid) from public, anon;
grant execute on function public.save_outfit_with_template(date, text, text, text, uuid[], boolean, uuid) to authenticated;

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

create or replace function public.create_outfit_template(
  p_name text,
  p_image_url text,
  p_item_ids uuid[]
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_template_id uuid;
  template_name text := nullif(btrim(p_name), '');
begin
  if current_user_id is null then
    raise exception 'ログインが必要です。';
  end if;

  if template_name is null
     and nullif(btrim(p_image_url), '') is null
     and cardinality(coalesce(p_item_ids, '{}'::uuid[])) = 0 then
    raise exception 'テンプレート名、全体画像、着用アイテムのいずれかを登録してください。';
  end if;

  if template_name is null then
    template_name :=
      'コーデテンプレート '
        || extract(year from current_date)::integer::text
        || '年'
        || extract(month from current_date)::integer::text
        || '月'
        || extract(day from current_date)::integer::text
        || '日';
  end if;

  if char_length(template_name) > 80 then
    raise exception 'テンプレート名は80文字以内で入力してください。';
  end if;

  insert into public.outfit_templates (user_id, name, image_url)
  values (current_user_id, template_name, p_image_url)
  returning id into saved_template_id;

  insert into public.outfit_template_items (template_id, item_id)
  select saved_template_id, selected.item_id
  from (
    select distinct item_id
    from unnest(coalesce(p_item_ids, '{}'::uuid[])) as selected_items(item_id)
  ) as selected;

  return saved_template_id;
end;
$$;

revoke all on function public.create_outfit_template(text, text, uuid[]) from public, anon;
grant execute on function public.create_outfit_template(text, text, uuid[]) to authenticated;

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
