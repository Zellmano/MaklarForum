-- Auto-update updated_at on row modification

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to all tables with an updated_at column
create trigger profiles_set_updated_at
  before update on profiles for each row execute function set_updated_at();

create trigger questions_set_updated_at
  before update on questions for each row execute function set_updated_at();

create trigger answers_set_updated_at
  before update on answers for each row execute function set_updated_at();

create trigger agent_groups_set_updated_at
  before update on agent_groups for each row execute function set_updated_at();

create trigger agent_tips_set_updated_at
  before update on agent_tips for each row execute function set_updated_at();

create trigger answer_votes_set_updated_at
  before update on answer_votes for each row execute function set_updated_at();

create trigger agent_tip_votes_set_updated_at
  before update on agent_tip_votes for each row execute function set_updated_at();
