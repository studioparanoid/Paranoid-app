do $$
begin
  if not exists (
    select 1
    from pg_constraint constraint_record
    where constraint_record.conrelid = 'public.profiles'::regclass
      and constraint_record.contype in ('p', 'u')
      and cardinality(constraint_record.conkey) = 1
      and (
        select attribute_record.attname
        from pg_attribute attribute_record
        where attribute_record.attrelid = constraint_record.conrelid
          and attribute_record.attnum = constraint_record.conkey[1]
      ) = 'id'
  ) then
    alter table public.profiles
      add constraint profiles_auth_user_id_key unique (id);
  end if;
end
$$;
