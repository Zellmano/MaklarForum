-- Ensure consumer insert policy for questions exists.

alter table questions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'questions' and policyname = 'consumer create own question'
  ) then
    create policy "consumer create own question"
      on questions
      for insert
      with check (
        asked_by = auth.uid()
        and exists (
          select 1
          from profiles p
          where p.id = auth.uid() and p.role = 'consumer'
        )
      );
  end if;
end
$$;
