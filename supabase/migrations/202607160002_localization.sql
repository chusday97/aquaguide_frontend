begin;

create type public.app_locale as enum ('zh-CN', 'en');

create table public.species_translations (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null references public.species(id) on delete cascade,
  locale public.app_locale not null,
  status public.content_status not null default 'draft',
  name text not null,
  category text not null,
  water_temperature_text text not null,
  ph_level_text text not null,
  description text not null,
  diet text not null,
  tank_size_text text not null,
  housing_mode text check (housing_mode is null or housing_mode in ('适合混养', '谨慎混养', '建议单养', 'Suitable for community tanks', 'Use caution in community tanks', 'Best kept alone')),
  housing_reason text,
  search_terms text[] not null default '{}',
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (species_id, locale)
);

create table public.species_feeding_profile_translations (
  id uuid primary key default gen_random_uuid(),
  feeding_profile_id uuid not null references public.species_feeding_profiles(id) on delete cascade,
  locale public.app_locale not null,
  status public.content_status not null default 'draft',
  diet_type text,
  feeding_type text not null,
  recommended_foods text not null,
  feeding_frequency text not null,
  portion_rule text not null,
  feeding_layer text,
  avoid_foods text not null,
  special_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (feeding_profile_id, locale)
);

create table public.care_article_translations (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.care_articles(id) on delete cascade,
  locale public.app_locale not null,
  status public.content_status not null default 'draft',
  title text not null,
  category text not null,
  urgency text not null check (urgency in ('日常', '尽快处理', '高优先级', 'Routine', 'Prompt attention', 'High priority')),
  summary text not null,
  symptoms text[] not null default '{}',
  avoid_actions text[] not null default '{}',
  observe_items text[] not null default '{}',
  diagnose_when text[] not null default '{}',
  next_step text not null,
  keywords text[] not null default '{}',
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (article_id, locale)
);

create table public.care_article_step_translations (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.care_article_steps(id) on delete cascade,
  locale public.app_locale not null,
  status public.content_status not null default 'draft',
  instruction text not null,
  duration_label text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (step_id, locale)
);

create index species_translations_locale_status_idx
  on public.species_translations(locale, status) where deleted_at is null;
create index feeding_translations_locale_status_idx
  on public.species_feeding_profile_translations(locale, status) where deleted_at is null;
create index care_translations_locale_status_idx
  on public.care_article_translations(locale, status) where deleted_at is null;
create index care_step_translations_locale_status_idx
  on public.care_article_step_translations(locale, status) where deleted_at is null;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'species_translations',
    'species_feeding_profile_translations',
    'care_article_translations',
    'care_article_step_translations'
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

create policy species_translations_public_select on public.species_translations for select using (
  public.is_admin() or (
    status = 'published' and deleted_at is null and exists (
      select 1 from public.species
      where species.id = species_translations.species_id
        and species.status = 'published'
        and species.deleted_at is null
    )
  )
);
create policy species_translations_admin_insert on public.species_translations for insert with check (public.is_admin());
create policy species_translations_admin_update on public.species_translations for update using (public.is_admin()) with check (public.is_admin());
create policy species_translations_admin_delete on public.species_translations for delete using (public.is_admin());

create policy feeding_translations_public_select on public.species_feeding_profile_translations for select using (
  public.is_admin() or (
    status = 'published' and deleted_at is null and exists (
      select 1 from public.species_feeding_profiles profile
      join public.species on species.id = profile.species_id
      where profile.id = species_feeding_profile_translations.feeding_profile_id
        and profile.deleted_at is null
        and species.status = 'published'
        and species.deleted_at is null
    )
  )
);
create policy feeding_translations_admin_insert on public.species_feeding_profile_translations for insert with check (public.is_admin());
create policy feeding_translations_admin_update on public.species_feeding_profile_translations for update using (public.is_admin()) with check (public.is_admin());
create policy feeding_translations_admin_delete on public.species_feeding_profile_translations for delete using (public.is_admin());

create policy care_translations_public_select on public.care_article_translations for select using (
  public.is_admin() or (
    status = 'published' and deleted_at is null and exists (
      select 1 from public.care_articles
      where care_articles.id = care_article_translations.article_id
        and care_articles.status = 'published'
        and care_articles.deleted_at is null
    )
  )
);
create policy care_translations_admin_insert on public.care_article_translations for insert with check (public.is_admin());
create policy care_translations_admin_update on public.care_article_translations for update using (public.is_admin()) with check (public.is_admin());
create policy care_translations_admin_delete on public.care_article_translations for delete using (public.is_admin());

create policy care_step_translations_public_select on public.care_article_step_translations for select using (
  public.is_admin() or (
    status = 'published' and deleted_at is null and exists (
      select 1 from public.care_article_steps step
      join public.care_articles article on article.id = step.article_id
      where step.id = care_article_step_translations.step_id
        and step.deleted_at is null
        and article.status = 'published'
        and article.deleted_at is null
    )
  )
);
create policy care_step_translations_admin_insert on public.care_article_step_translations for insert with check (public.is_admin());
create policy care_step_translations_admin_update on public.care_article_step_translations for update using (public.is_admin()) with check (public.is_admin());
create policy care_step_translations_admin_delete on public.care_article_step_translations for delete using (public.is_admin());

commit;
