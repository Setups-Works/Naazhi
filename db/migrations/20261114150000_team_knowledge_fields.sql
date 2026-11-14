-- More facts about a team member for the public profile page and its structured data (schema.org Person), which is what search engines use
-- to understand who someone is and, when they choose to, build a knowledge panel: other names the person goes by, topics they know,
-- where they are based, where they studied and awards. All optional and entered by an admin; nothing is guessed. Lists are kept as
-- JSON (like profile_links) and checked for size here. Personal details such as birth date, phone, email or family have no column on
-- purpose: this page is public.

alter table public.team_members
  add column if not exists alternate_names jsonb not null default '[]'::jsonb,
  add column if not exists knows_about jsonb not null default '[]'::jsonb,
  add column if not exists awards jsonb not null default '[]'::jsonb,
  add column if not exists location text not null default '',
  add column if not exists alumni_of text not null default '',
  add column if not exists alumni_url text;

alter table public.team_members drop constraint if exists team_members_knowledge_check;
alter table public.team_members add constraint team_members_knowledge_check check (
  jsonb_typeof(alternate_names) = 'array' and jsonb_array_length(alternate_names) <= 6
  and jsonb_typeof(knows_about) = 'array' and jsonb_array_length(knows_about) <= 12
  and jsonb_typeof(awards) = 'array' and jsonb_array_length(awards) <= 5
  and char_length(location) <= 80
  and char_length(alumni_of) <= 120
  and (alumni_url is null or alumni_url ~ '^https://')
);
