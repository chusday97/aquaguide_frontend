begin;

create table public.species_recognition_misses (
  id uuid primary key default gen_random_uuid(),
  image_sha256 text not null check (char_length(image_sha256) = 64),
  model_name text not null,
  model_version text,
  candidate_labels jsonb not null default '[]'::jsonb,
  candidate_catalog_keys text[] not null default '{}',
  resolved_catalog_key text references public.species(catalog_key) on delete set null,
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index species_recognition_misses_fingerprint_idx
  on public.species_recognition_misses
  (image_sha256, model_name, coalesce(model_version, ''));

create index species_recognition_misses_unresolved_idx
  on public.species_recognition_misses(last_seen_at desc)
  where resolved_at is null;

alter table public.species_recognition_misses enable row level security;

-- Intentionally no client RLS policies. Only the backend service role may aggregate
-- misses or resolve them; anonymous users cannot enumerate recognition metadata.

commit;
