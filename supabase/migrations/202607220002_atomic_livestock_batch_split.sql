begin;

create or replace function public.split_aquarium_species_batch(
  source_batch_id uuid,
  expected_species_record_id uuid,
  source_version integer,
  split_quantity integer,
  split_entry_date date,
  split_life_stage public.aquarium_life_stage,
  split_reproductive_state public.aquarium_reproductive_state,
  new_batch_id uuid
)
returns setof public.aquarium_species_batches
language plpgsql
as $$
declare
  source_row public.aquarium_species_batches%rowtype;
begin
  if exists (
    select 1 from public.aquarium_species_batches
    where id = new_batch_id and aquarium_species_id = expected_species_record_id and deleted_at is null
  ) then
    return query
      select * from public.aquarium_species_batches
      where aquarium_species_id = (
        select aquarium_species_id from public.aquarium_species_batches where id = new_batch_id
      ) and deleted_at is null
      order by created_at;
    return;
  end if;

  select * into source_row
  from public.aquarium_species_batches
  where id = source_batch_id
    and aquarium_species_id = expected_species_record_id
    and version = source_version
    and deleted_at is null
  for update;

  if not found then raise exception using errcode = '40001', message = 'BATCH_VERSION_CONFLICT'; end if;
  if split_quantity < 1 or split_quantity >= source_row.quantity then
    raise exception using errcode = '22023', message = 'INVALID_SPLIT_QUANTITY';
  end if;

  update public.aquarium_species_batches
  set quantity = source_row.quantity - split_quantity
  where id = source_batch_id;

  insert into public.aquarium_species_batches (
    id, aquarium_species_id, quantity, entry_date, life_stage, reproductive_state, state_updated_at
  ) values (
    new_batch_id,
    source_row.aquarium_species_id,
    split_quantity,
    coalesce(split_entry_date, source_row.entry_date),
    split_life_stage,
    split_reproductive_state,
    now()
  );

  return query
    select * from public.aquarium_species_batches
    where aquarium_species_id = source_row.aquarium_species_id and deleted_at is null
    order by created_at;
end;
$$;

revoke all on function public.split_aquarium_species_batch(uuid, uuid, integer, integer, date, public.aquarium_life_stage, public.aquarium_reproductive_state, uuid) from public;
grant execute on function public.split_aquarium_species_batch(uuid, uuid, integer, integer, date, public.aquarium_life_stage, public.aquarium_reproductive_state, uuid) to authenticated;

commit;
