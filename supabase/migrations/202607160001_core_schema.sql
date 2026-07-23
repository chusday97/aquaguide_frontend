begin;

create extension if not exists pgcrypto;

create type public.content_status as enum ('draft', 'published', 'archived');
create type public.user_role as enum ('user', 'admin');
create type public.asset_variant as enum ('original', 'thumbnail', 'detail', 'texture', 'article_main', 'article_step');
create type public.water_type as enum ('Freshwater', 'Saltwater');
create type public.component_type as enum ('substrate', 'plant', 'hardscape');
create type public.care_event_type as enum ('water_change', 'feeding', 'observation', 'checklist_completed');
create type public.migration_status as enum ('previewed', 'committing', 'completed', 'failed');

create or replace function public.set_updated_at_and_version()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nickname text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0)
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0)
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, nickname)
  values (new.id, nullif(new.raw_user_meta_data ->> 'nickname', ''))
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
      and deleted_at is null
  );
$$;

create table public.species (
  id uuid primary key default gen_random_uuid(),
  catalog_key text not null unique,
  name text not null,
  scientific_name text not null,
  category text not null,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  water_temperature_text text not null,
  water_temperature_min_c numeric(4,1),
  water_temperature_max_c numeric(4,1),
  ph_level_text text not null,
  ph_min numeric(3,1),
  ph_max numeric(3,1),
  water_change_cycle_days integer not null check (water_change_cycle_days > 0),
  description text not null,
  diet text not null,
  tank_size_text text not null,
  min_tank_liters numeric(8,2),
  temperament text not null check (temperament in ('Peaceful', 'Aggressive', 'Territorial')),
  size_class text not null check (size_class in ('Small', 'Medium', 'Large')),
  housing_mode text check (housing_mode in ('适合混养', '谨慎混养', '建议单养')),
  housing_reason text,
  is_custom boolean not null default false,
  search_terms text[] not null default '{}',
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  check (water_temperature_min_c is null or water_temperature_max_c is null or water_temperature_min_c <= water_temperature_max_c),
  check (ph_min is null or ph_max is null or ph_min <= ph_max)
);

create table public.species_feeding_profiles (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null unique references public.species(id) on delete cascade,
  diet_type text,
  feeding_type text not null,
  recommended_foods text not null,
  feeding_frequency text not null,
  portion_rule text not null,
  feeding_layer text,
  avoid_foods text not null,
  special_notes text,
  confidence text,
  source_name text,
  source_url text,
  source_fields text[] not null default '{}',
  needs_review boolean not null default false,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0)
);

create table public.species_assets (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null references public.species(id) on delete cascade,
  variant public.asset_variant not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text not null,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  byte_size bigint check (byte_size is null or byte_size >= 0),
  checksum_sha256 text,
  asset_version integer not null default 1 check (asset_version > 0),
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (storage_bucket, storage_path),
  check (variant in ('original', 'thumbnail', 'detail', 'texture'))
);

create unique index species_assets_current_variant_idx
  on public.species_assets(species_id, variant)
  where is_current and deleted_at is null;

create table public.care_articles (
  id uuid primary key default gen_random_uuid(),
  catalog_key text not null unique,
  title text not null,
  category text not null,
  urgency text not null check (urgency in ('日常', '尽快处理', '高优先级')),
  summary text not null,
  symptoms text[] not null default '{}',
  avoid_actions text[] not null default '{}',
  observe_items text[] not null default '{}',
  diagnose_when text[] not null default '{}',
  next_step text not null,
  keywords text[] not null default '{}',
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0)
);

create table public.care_article_steps (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.care_articles(id) on delete cascade,
  position integer not null check (position > 0),
  instruction text not null,
  duration_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (article_id, position)
);

create table public.care_article_assets (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.care_articles(id) on delete cascade,
  step_id uuid references public.care_article_steps(id) on delete cascade,
  variant public.asset_variant not null check (variant in ('original', 'article_main', 'article_step')),
  storage_bucket text not null,
  storage_path text not null,
  mime_type text not null,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  byte_size bigint check (byte_size is null or byte_size >= 0),
  checksum_sha256 text,
  asset_version integer not null default 1 check (asset_version > 0),
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (storage_bucket, storage_path)
);

create unique index care_article_assets_current_main_idx
  on public.care_article_assets(article_id, variant)
  where step_id is null and is_current and deleted_at is null;

create unique index care_article_assets_current_step_idx
  on public.care_article_assets(step_id, variant)
  where step_id is not null and is_current and deleted_at is null;

create table public.aquariums (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  water_type public.water_type,
  length_cm numeric(8,2) check (length_cm is null or length_cm > 0),
  width_cm numeric(8,2) check (width_cm is null or width_cm > 0),
  height_cm numeric(8,2) check (height_cm is null or height_cm > 0),
  target_temperature_c numeric(4,1),
  last_water_change_at timestamptz,
  last_water_stored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0)
);

create index aquariums_owner_idx on public.aquariums(owner_id) where deleted_at is null;

create table public.aquarium_species (
  id uuid primary key default gen_random_uuid(),
  aquarium_id uuid not null references public.aquariums(id) on delete cascade,
  species_id uuid references public.species(id) on delete set null,
  species_catalog_key text not null,
  quantity integer not null check (quantity > 0),
  entry_date date not null,
  last_water_change_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0)
);

create unique index aquarium_species_active_key_idx
  on public.aquarium_species(aquarium_id, species_catalog_key)
  where deleted_at is null;

create table public.aquarium_equipment (
  id uuid primary key default gen_random_uuid(),
  aquarium_id uuid not null unique references public.aquariums(id) on delete cascade,
  filter_type text,
  heater boolean,
  oxygen boolean,
  light_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0)
);

create table public.aquarium_components (
  id uuid primary key default gen_random_uuid(),
  aquarium_id uuid not null references public.aquariums(id) on delete cascade,
  component_type public.component_type not null,
  name text not null,
  quantity integer check (quantity is null or quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0)
);

create table public.diagnosis_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  aquarium_id uuid not null references public.aquariums(id) on delete cascade,
  diagnosis_key text not null,
  local_date date not null,
  problem_type text not null,
  source_type text,
  source_title text,
  answers jsonb not null default '{}'::jsonb,
  structured_answers jsonb not null default '[]'::jsonb,
  result_summary text not null,
  risk_level text not null,
  risk_code text check (risk_code is null or risk_code in ('low', 'medium', 'high', 'unknown')),
  conclusion text,
  key_metrics jsonb not null default '[]'::jsonb,
  suggested_actions text[] not null default '{}',
  avoid_actions text[] not null default '{}',
  observe_items text[] not null default '{}',
  missing_info text[] not null default '{}',
  optional_missing_info text[] not null default '{}',
  next_check_at timestamptz,
  follow_up_notes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (owner_id, diagnosis_key)
);

create unique index diagnosis_daily_check_idx
  on public.diagnosis_records(aquarium_id, local_date)
  where problem_type = '巡检' and deleted_at is null;

create table public.species_favorites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  species_id uuid not null references public.species(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (owner_id, species_id)
);

create table public.care_favorites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid not null references public.care_articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (owner_id, article_id)
);

create table public.memorial_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  aquarium_id uuid references public.aquariums(id) on delete set null,
  species_id uuid references public.species(id) on delete set null,
  species_catalog_key text not null,
  memorial_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0)
);

create table public.care_reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  aquarium_id uuid references public.aquariums(id) on delete cascade,
  source_article_id uuid references public.care_articles(id) on delete set null,
  source_catalog_key text not null,
  title text not null,
  reminder_type text not null,
  scheduled_for timestamptz not null,
  label text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0)
);

create unique index care_reminders_active_source_idx
  on public.care_reminders(owner_id, source_catalog_key, coalesce(aquarium_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where completed_at is null and deleted_at is null;

create table public.care_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  aquarium_id uuid references public.aquariums(id) on delete cascade,
  event_type public.care_event_type not null,
  title text not null,
  label text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0)
);

create table public.migration_batches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  source_version integer not null,
  status public.migration_status not null default 'previewed',
  preview_summary jsonb not null default '{}'::jsonb,
  result_summary jsonb,
  error_summary jsonb,
  committed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (owner_id, idempotency_key)
);

create table public.idempotency_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  request_method text not null,
  request_path text not null,
  request_hash text not null,
  resource_type text,
  resource_id uuid,
  response_status integer not null check (response_status between 200 and 599),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (owner_id, idempotency_key)
);

create index species_catalog_status_idx on public.species(status, category) where deleted_at is null;
create index species_search_terms_idx on public.species using gin(search_terms);
create index care_articles_status_category_idx on public.care_articles(status, category) where deleted_at is null;
create index care_articles_keywords_idx on public.care_articles using gin(keywords);
create index diagnosis_owner_aquarium_idx on public.diagnosis_records(owner_id, aquarium_id, local_date desc) where deleted_at is null;
create index memorial_owner_date_idx on public.memorial_records(owner_id, memorial_date desc) where deleted_at is null;
create index care_reminders_owner_schedule_idx on public.care_reminders(owner_id, scheduled_for) where deleted_at is null;
create index care_events_owner_occurred_idx on public.care_events(owner_id, occurred_at desc) where deleted_at is null;
create index idempotency_records_expiry_idx on public.idempotency_records(expires_at);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'user_roles', 'species', 'species_feeding_profiles', 'species_assets',
    'care_articles', 'care_article_steps', 'care_article_assets', 'aquariums',
    'aquarium_species', 'aquarium_equipment', 'aquarium_components', 'diagnosis_records',
    'species_favorites', 'care_favorites', 'memorial_records', 'care_reminders',
    'care_events', 'migration_batches', 'idempotency_records'
  ] loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at_and_version()',
      table_name,
      table_name
    );
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create policy profiles_select_own on public.profiles for select using (user_id = auth.uid());
create policy profiles_insert_own on public.profiles for insert with check (user_id = auth.uid());
create policy profiles_update_own on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_delete_own on public.profiles for delete using (user_id = auth.uid());

create policy user_roles_select_own on public.user_roles for select using (user_id = auth.uid() or public.is_admin());
create policy user_roles_admin_insert on public.user_roles for insert with check (public.is_admin());
create policy user_roles_admin_update on public.user_roles for update using (public.is_admin()) with check (public.is_admin());
create policy user_roles_admin_delete on public.user_roles for delete using (public.is_admin());

create policy species_public_select on public.species for select using ((status = 'published' and deleted_at is null) or public.is_admin());
create policy species_admin_insert on public.species for insert with check (public.is_admin());
create policy species_admin_update on public.species for update using (public.is_admin()) with check (public.is_admin());
create policy species_admin_delete on public.species for delete using (public.is_admin());

create policy feeding_public_select on public.species_feeding_profiles for select using (
  (deleted_at is null and exists (select 1 from public.species s where s.id = species_id and s.status = 'published' and s.deleted_at is null))
  or public.is_admin()
);
create policy feeding_admin_insert on public.species_feeding_profiles for insert with check (public.is_admin());
create policy feeding_admin_update on public.species_feeding_profiles for update using (public.is_admin()) with check (public.is_admin());
create policy feeding_admin_delete on public.species_feeding_profiles for delete using (public.is_admin());

create policy species_assets_public_select on public.species_assets for select using (
  (storage_bucket = 'catalog-public' and deleted_at is null and exists (select 1 from public.species s where s.id = species_id and s.status = 'published' and s.deleted_at is null))
  or public.is_admin()
);
create policy species_assets_admin_insert on public.species_assets for insert with check (public.is_admin());
create policy species_assets_admin_update on public.species_assets for update using (public.is_admin()) with check (public.is_admin());
create policy species_assets_admin_delete on public.species_assets for delete using (public.is_admin());

create policy care_articles_public_select on public.care_articles for select using ((status = 'published' and deleted_at is null) or public.is_admin());
create policy care_articles_admin_insert on public.care_articles for insert with check (public.is_admin());
create policy care_articles_admin_update on public.care_articles for update using (public.is_admin()) with check (public.is_admin());
create policy care_articles_admin_delete on public.care_articles for delete using (public.is_admin());

create policy care_steps_public_select on public.care_article_steps for select using (
  (deleted_at is null and exists (select 1 from public.care_articles a where a.id = article_id and a.status = 'published' and a.deleted_at is null))
  or public.is_admin()
);
create policy care_steps_admin_insert on public.care_article_steps for insert with check (public.is_admin());
create policy care_steps_admin_update on public.care_article_steps for update using (public.is_admin()) with check (public.is_admin());
create policy care_steps_admin_delete on public.care_article_steps for delete using (public.is_admin());

create policy care_assets_public_select on public.care_article_assets for select using (
  (storage_bucket = 'catalog-public' and deleted_at is null and exists (select 1 from public.care_articles a where a.id = article_id and a.status = 'published' and a.deleted_at is null))
  or public.is_admin()
);
create policy care_assets_admin_insert on public.care_article_assets for insert with check (public.is_admin());
create policy care_assets_admin_update on public.care_article_assets for update using (public.is_admin()) with check (public.is_admin());
create policy care_assets_admin_delete on public.care_article_assets for delete using (public.is_admin());

create policy aquariums_owner_all on public.aquariums for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy aquarium_species_owner_all on public.aquarium_species for all using (
  exists (select 1 from public.aquariums a where a.id = aquarium_id and a.owner_id = auth.uid())
) with check (
  exists (select 1 from public.aquariums a where a.id = aquarium_id and a.owner_id = auth.uid())
);

create policy aquarium_equipment_owner_all on public.aquarium_equipment for all using (
  exists (select 1 from public.aquariums a where a.id = aquarium_id and a.owner_id = auth.uid())
) with check (
  exists (select 1 from public.aquariums a where a.id = aquarium_id and a.owner_id = auth.uid())
);

create policy aquarium_components_owner_all on public.aquarium_components for all using (
  exists (select 1 from public.aquariums a where a.id = aquarium_id and a.owner_id = auth.uid())
) with check (
  exists (select 1 from public.aquariums a where a.id = aquarium_id and a.owner_id = auth.uid())
);

create policy diagnosis_owner_all on public.diagnosis_records for all using (
  owner_id = auth.uid() and exists (select 1 from public.aquariums a where a.id = aquarium_id and a.owner_id = auth.uid())
) with check (
  owner_id = auth.uid() and exists (select 1 from public.aquariums a where a.id = aquarium_id and a.owner_id = auth.uid())
);

create policy species_favorites_owner_all on public.species_favorites for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy care_favorites_owner_all on public.care_favorites for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy memorial_owner_all on public.memorial_records for all using (
  owner_id = auth.uid() and (aquarium_id is null or exists (select 1 from public.aquariums a where a.id = aquarium_id and a.owner_id = auth.uid()))
) with check (
  owner_id = auth.uid() and (aquarium_id is null or exists (select 1 from public.aquariums a where a.id = aquarium_id and a.owner_id = auth.uid()))
);

create policy care_reminders_owner_all on public.care_reminders for all using (
  owner_id = auth.uid() and (aquarium_id is null or exists (select 1 from public.aquariums a where a.id = aquarium_id and a.owner_id = auth.uid()))
) with check (
  owner_id = auth.uid() and (aquarium_id is null or exists (select 1 from public.aquariums a where a.id = aquarium_id and a.owner_id = auth.uid()))
);

create policy care_events_owner_all on public.care_events for all using (
  owner_id = auth.uid() and (aquarium_id is null or exists (select 1 from public.aquariums a where a.id = aquarium_id and a.owner_id = auth.uid()))
) with check (
  owner_id = auth.uid() and (aquarium_id is null or exists (select 1 from public.aquariums a where a.id = aquarium_id and a.owner_id = auth.uid()))
);

create policy migration_batches_owner_all on public.migration_batches for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy idempotency_records_owner_all on public.idempotency_records for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('catalog-originals', 'catalog-originals', false, 20971520, array['image/png', 'image/jpeg', 'image/webp']),
  ('catalog-public', 'catalog-public', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy catalog_public_read on storage.objects for select using (bucket_id = 'catalog-public');
create policy catalog_admin_insert on storage.objects for insert with check (bucket_id in ('catalog-originals', 'catalog-public') and public.is_admin());
create policy catalog_admin_update on storage.objects for update using (bucket_id in ('catalog-originals', 'catalog-public') and public.is_admin()) with check (bucket_id in ('catalog-originals', 'catalog-public') and public.is_admin());
create policy catalog_admin_delete on storage.objects for delete using (bucket_id in ('catalog-originals', 'catalog-public') and public.is_admin());
create policy catalog_admin_original_read on storage.objects for select using (bucket_id = 'catalog-originals' and public.is_admin());

commit;
