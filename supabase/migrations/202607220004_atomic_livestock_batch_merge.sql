begin;

create or replace function public.merge_aquarium_species_batches(
  expected_species_record_id uuid,
  target_batch_id uuid,
  source_batch_id uuid,
  final_entry_date date,
  final_life_stage text,
  final_reproductive_state text,
  target_version integer,
  source_version integer
)
returns setof public.aquarium_species_batches
language plpgsql
as $$
declare
  target_row public.aquarium_species_batches%rowtype;
  source_row public.aquarium_species_batches%rowtype;
begin
  if target_batch_id = source_batch_id then
    raise exception using errcode = '22023', message = 'SAME_BATCH';
  end if;

  perform id from public.aquarium_species_batches
  where id in (target_batch_id, source_batch_id)
    and aquarium_species_id = expected_species_record_id
    and deleted_at is null
  order by id
  for update;

  select * into target_row from public.aquarium_species_batches
  where id = target_batch_id and aquarium_species_id = expected_species_record_id and version = target_version and deleted_at is null;
  select * into source_row from public.aquarium_species_batches
  where id = source_batch_id and aquarium_species_id = expected_species_record_id and version = source_version and deleted_at is null;
  if target_row.id is null or source_row.id is null then raise exception using errcode = '40001', message = 'BATCH_VERSION_CONFLICT'; end if;
  update public.aquarium_species_batches
  set quantity = target_row.quantity + source_row.quantity,
      entry_date = final_entry_date,
      life_stage = final_life_stage,
      reproductive_state = final_reproductive_state,
      state_updated_at = case
        when target_row.life_stage <> final_life_stage or target_row.reproductive_state <> final_reproductive_state then now()
        else target_row.state_updated_at
      end
  where id = target_batch_id;
  update public.aquarium_species_batches set deleted_at = now() where id = source_batch_id;

  return query select * from public.aquarium_species_batches
  where aquarium_species_id = expected_species_record_id and deleted_at is null
  order by created_at;
end;
$$;

revoke all on function public.merge_aquarium_species_batches(uuid, uuid, uuid, date, text, text, integer, integer) from public;
grant execute on function public.merge_aquarium_species_batches(uuid, uuid, uuid, date, text, text, integer, integer) to authenticated;

commit;
