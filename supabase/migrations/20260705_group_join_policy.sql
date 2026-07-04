-- ============================================================
-- Join policy: starter groups require approval; firm groups
-- auto-admit members whose company email domain matches.
-- Run in the SQL Editor of the production project (rjrj…).
-- ============================================================

-- 1) Company email domain for auto-join (firm groups).
alter table agent_groups
  add column if not exists email_domain text;

-- 2) All seeded starter groups become apply-to-join. (Matching email
--    domain bypasses approval — handled in application code.)
update agent_groups set is_private = true where category in ('city', 'firm', 'school');

-- 3) Firm domains. Adjust freely — a member whose email ends with
--    @<domain> joins that group instantly, everyone else must apply.
update agent_groups g
set email_domain = v.domain
from (values
  ('firma-fastighetsbyran',             'fastighetsbyran.se'),
  ('firma-svensk-fastighetsformedling', 'svenskfast.se'),
  ('firma-lansforsakringar',            'lansfast.se'),
  ('firma-husmanhagberg',               'husmanhagberg.se'),
  ('firma-maklarhuset',                 'maklarhuset.se'),
  ('firma-bjurfors',                    'bjurfors.se'),
  ('firma-skandiamaklarna',             'skandiamaklarna.se'),
  ('firma-erik-olsson',                 'erikolsson.se'),
  ('firma-notar',                       'notar.se'),
  ('firma-maklarringen',                'maklarringen.se'),
  ('firma-era-sverige',                 'erasweden.com'),
  ('firma-widerlov',                    'widerlov.se'),
  ('firma-sodermaklarna',               'sodermaklarna.se'),
  ('firma-vaningen-och-villan',         'vaningen.se'),
  ('firma-historiska-hem',              'historiskahem.se'),
  ('firma-alexander-white',             'alexanderwhite.se'),
  ('firma-karlsson-uddare',             'karlssonuddare.se'),
  ('firma-edward-partners',             'edwardpartners.se'),
  ('firma-mohv',                        'mohv.se'),
  ('firma-fantastic-frank',             'fantasticfrank.se')
) as v(slug, domain)
where g.slug = v.slug;
