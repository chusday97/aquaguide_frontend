begin;

create or replace function public.record_livestock_memorial(
  target_aquarium_id uuid,
  target_species_record_id uuid,
  target_batch_id uuid,
  target_batch_version integer,
  target_memorial_date date,
  target_reason text,
  new_memorial_id uuid
)
returns public.memorial_records
language plpgsql
as $$
declare
  batch_row public.aquarium_species_batches%rowtype;
  species_uuid uuid;
  species_record public.aquarium_species%rowtype;
  memorial_row public.memorial_records%rowtype;
begin
  select * into memorial_row from public.memorial_records where id = new_memorial_id;
  if found then return memorial_row; end if;

  select * into batch_row
  from public.aquarium_species_batches
  where id = target_batch_id
    and aquarium_species_id = target_species_record_id
    and version = target_batch_version
    and deleted_at is null
  for update;
  if not found then raise exception using errcode = '40001', message = 'BATCH_VERSION_CONFLICT'; end if;

  select * into species_record
  from public.aquarium_species
  where id = target_species_record_id
    and aquarium_id = target_aquarium_id
    and deleted_at is null;
  if not found then raise exception using errcode = '42501', message = 'SPECIES_PATH_MISMATCH'; end if;

  if batch_row.quantity = 1 then
    update public.aquarium_species_batches set deleted_at = now() where id = target_batch_id;
  else
    update public.aquarium_species_batches set quantity = batch_row.quantity - 1 where id = target_batch_id;
  end if;

  species_uuid := species_record.species_id;
  insert into public.memorial_records (
    id, owner_id, aquarium_id, species_id, species_catalog_key, memorial_date, reason
  ) values (
    new_memorial_id, auth.uid(), species_record.aquarium_id, species_uuid, species_record.species_catalog_key, target_memorial_date, target_reason
  ) returning * into memorial_row;

  return memorial_row;
end;
$$;

revoke all on function public.record_livestock_memorial(uuid, uuid, uuid, integer, date, text, uuid) from public;
grant execute on function public.record_livestock_memorial(uuid, uuid, uuid, integer, date, text, uuid) to authenticated;

commit;
