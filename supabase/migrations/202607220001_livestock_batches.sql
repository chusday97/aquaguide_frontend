begin;

create type public.aquarium_life_stage as enum ('unknown', 'juvenile', 'adult');
create type public.aquarium_reproductive_state as enum (
  'unknown',
  'not_applicable',
  'normal',
  'pregnant_or_gravid',
  'in_labor_or_spawning',
  'postpartum_recovery'
);

create table public.aquarium_species_batches (
  id uuid primary key default gen_random_uuid(),
  aquarium_species_id uuid not null references public.aquarium_species(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  entry_date date not null,
  life_stage public.aquarium_life_stage not null default 'unknown',
  reproductive_state public.aquarium_reproductive_state not null default 'unknown',
  state_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0)
);

create index aquarium_species_batches_parent_idx
  on public.aquarium_species_batches(aquarium_species_id)
  where deleted_at is null;

insert into public.aquarium_species_batches (
  aquarium_species_id,
  quantity,
  entry_date,
  life_stage,
  reproductive_state,
  state_updated_at
)
select id, quantity, entry_date, 'unknown', 'unknown', updated_at
from public.aquarium_species
where deleted_at is null;

create or replace function public.sync_aquarium_species_batch_quantity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_species_id uuid;
  active_quantity integer;
begin
  target_species_id := coalesce(new.aquarium_species_id, old.aquarium_species_id);

  select coalesce(sum(quantity), 0)::integer
  into active_quantity
  from public.aquarium_species_batches
  where aquarium_species_id = target_species_id
    and deleted_at is null;

  if active_quantity > 0 then
    update public.aquarium_species
    set quantity = active_quantity,
        deleted_at = null
    where id = target_species_id;
  else
    update public.aquarium_species
    set deleted_at = coalesce(deleted_at, now())
    where id = target_species_id;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger aquarium_species_batches_set_updated_at
  before update on public.aquarium_species_batches
  for each row execute function public.set_updated_at_and_version();

create trigger aquarium_species_batches_sync_quantity
  after insert or update or delete on public.aquarium_species_batches
  for each row execute function public.sync_aquarium_species_batch_quantity();

alter table public.aquarium_species_batches enable row level security;

create policy aquarium_species_batches_owner_all
on public.aquarium_species_batches
for all
using (
  exists (
    select 1
    from public.aquarium_species s
    join public.aquariums a on a.id = s.aquarium_id
    where s.id = aquarium_species_id
      and s.deleted_at is null
      and a.deleted_at is null
      and a.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.aquarium_species s
    join public.aquariums a on a.id = s.aquarium_id
    where s.id = aquarium_species_id
      and s.deleted_at is null
      and a.deleted_at is null
      and a.owner_id = auth.uid()
  )
);

commit;
