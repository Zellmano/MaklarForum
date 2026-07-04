-- ============================================================
-- Starter groups: Sveriges största mäklarfirmor, städer och
-- högskolor med mäklarprogram — publika, en-klicks-join.
-- Plus: study_year på profiles (studenters årgång).
-- Run in the SQL Editor of the production project (rjrj…).
-- Requires at least one admin profile (created_by/approved_by).
-- ============================================================

-- 1) Category so the UI can section the group directory.
alter table agent_groups
  add column if not exists category text;

do $$
begin
  alter table agent_groups
    add constraint agent_groups_category_check
    check (category in ('city', 'firm', 'school'));
exception
  when duplicate_object then null;
end $$;

-- 2) Student cohort (start year) chosen at registration.
alter table profiles
  add column if not exists study_year text;

-- 3) Seed the starter groups. Idempotent: on conflict (slug) do nothing.
do $$
declare
  admin_id uuid;
begin
  select id into admin_id from profiles where role = 'admin' order by created_at limit 1;
  if admin_id is null then
    raise notice 'No admin profile found — skipping starter group seed. Re-run after creating an admin.';
    return;
  end if;

  insert into agent_groups
    (name, slug, description, municipality, region, is_private, status, created_by, approved_by, approved_at, category)
  values
    -- ── Sveriges 30 största städer ─────────────────────────────
    ('Mäklare i Stockholm',    'maklare-i-stockholm',    'För alla i mäklarbranschen verksamma i Stockholm med omnejd.', 'Stockholm',    'Stockholms län',        false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Göteborg',     'maklare-i-goteborg',     'För alla i mäklarbranschen verksamma i Göteborg med omnejd.',  'Göteborg',     'Västra Götalands län',  false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Malmö',        'maklare-i-malmo',        'För alla i mäklarbranschen verksamma i Malmö med omnejd.',    'Malmö',        'Skåne län',             false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Uppsala',      'maklare-i-uppsala',      'För alla i mäklarbranschen verksamma i Uppsala med omnejd.',  'Uppsala',      'Uppsala län',           false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Västerås',     'maklare-i-vasteras',     'För alla i mäklarbranschen verksamma i Västerås med omnejd.', 'Västerås',     'Västmanlands län',      false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Örebro',       'maklare-i-orebro',       'För alla i mäklarbranschen verksamma i Örebro med omnejd.',   'Örebro',       'Örebro län',            false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Linköping',    'maklare-i-linkoping',    'För alla i mäklarbranschen verksamma i Linköping med omnejd.','Linköping',    'Östergötlands län',     false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Helsingborg',  'maklare-i-helsingborg',  'För alla i mäklarbranschen verksamma i Helsingborg med omnejd.','Helsingborg', 'Skåne län',            false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Jönköping',    'maklare-i-jonkoping',    'För alla i mäklarbranschen verksamma i Jönköping med omnejd.','Jönköping',    'Jönköpings län',        false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Norrköping',   'maklare-i-norrkoping',   'För alla i mäklarbranschen verksamma i Norrköping med omnejd.','Norrköping',  'Östergötlands län',     false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Lund',         'maklare-i-lund',         'För alla i mäklarbranschen verksamma i Lund med omnejd.',     'Lund',         'Skåne län',             false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Umeå',         'maklare-i-umea',         'För alla i mäklarbranschen verksamma i Umeå med omnejd.',     'Umeå',         'Västerbottens län',     false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Gävle',        'maklare-i-gavle',        'För alla i mäklarbranschen verksamma i Gävle med omnejd.',    'Gävle',        'Gävleborgs län',        false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Borås',        'maklare-i-boras',        'För alla i mäklarbranschen verksamma i Borås med omnejd.',    'Borås',        'Västra Götalands län',  false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Södertälje',   'maklare-i-sodertalje',   'För alla i mäklarbranschen verksamma i Södertälje med omnejd.','Södertälje',  'Stockholms län',        false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Eskilstuna',   'maklare-i-eskilstuna',   'För alla i mäklarbranschen verksamma i Eskilstuna med omnejd.','Eskilstuna',  'Södermanlands län',     false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Halmstad',     'maklare-i-halmstad',     'För alla i mäklarbranschen verksamma i Halmstad med omnejd.', 'Halmstad',     'Hallands län',          false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Växjö',        'maklare-i-vaxjo',        'För alla i mäklarbranschen verksamma i Växjö med omnejd.',    'Växjö',        'Kronobergs län',        false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Karlstad',     'maklare-i-karlstad',     'För alla i mäklarbranschen verksamma i Karlstad med omnejd.', 'Karlstad',     'Värmlands län',         false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Sundsvall',    'maklare-i-sundsvall',    'För alla i mäklarbranschen verksamma i Sundsvall med omnejd.','Sundsvall',    'Västernorrlands län',   false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Östersund',    'maklare-i-ostersund',    'För alla i mäklarbranschen verksamma i Östersund med omnejd.','Östersund',    'Jämtlands län',         false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Trollhättan',  'maklare-i-trollhattan',  'För alla i mäklarbranschen verksamma i Trollhättan med omnejd.','Trollhättan','Västra Götalands län',  false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Luleå',        'maklare-i-lulea',        'För alla i mäklarbranschen verksamma i Luleå med omnejd.',    'Luleå',        'Norrbottens län',       false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Borlänge',     'maklare-i-borlange',     'För alla i mäklarbranschen verksamma i Borlänge med omnejd.', 'Borlänge',     'Dalarnas län',          false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Falun',        'maklare-i-falun',        'För alla i mäklarbranschen verksamma i Falun med omnejd.',    'Falun',        'Dalarnas län',          false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Kalmar',       'maklare-i-kalmar',       'För alla i mäklarbranschen verksamma i Kalmar med omnejd.',   'Kalmar',       'Kalmar län',            false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Kristianstad', 'maklare-i-kristianstad', 'För alla i mäklarbranschen verksamma i Kristianstad med omnejd.','Kristianstad','Skåne län',           false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Skellefteå',   'maklare-i-skelleftea',   'För alla i mäklarbranschen verksamma i Skellefteå med omnejd.','Skellefteå',  'Västerbottens län',     false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Uddevalla',    'maklare-i-uddevalla',    'För alla i mäklarbranschen verksamma i Uddevalla med omnejd.','Uddevalla',    'Västra Götalands län',  false, 'approved', admin_id, admin_id, now(), 'city'),
    ('Mäklare i Varberg',      'maklare-i-varberg',      'För alla i mäklarbranschen verksamma i Varberg med omnejd.',  'Varberg',      'Hallands län',          false, 'approved', admin_id, admin_id, now(), 'city'),

    -- ── Sveriges 20 största mäklarfirmor/kedjor ────────────────
    ('Fastighetsbyrån',                      'firma-fastighetsbyran',            'För dig som jobbar på Fastighetsbyrån — rikstäckande intern grupp.',                      null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('Svensk Fastighetsförmedling',          'firma-svensk-fastighetsformedling','För dig som jobbar på Svensk Fastighetsförmedling — rikstäckande intern grupp.',          null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('Länsförsäkringar Fastighetsförmedling','firma-lansforsakringar',           'För dig som jobbar på Länsförsäkringar Fastighetsförmedling — rikstäckande intern grupp.',null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('HusmanHagberg',                        'firma-husmanhagberg',              'För dig som jobbar på HusmanHagberg — rikstäckande intern grupp.',                        null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('Mäklarhuset',                          'firma-maklarhuset',                'För dig som jobbar på Mäklarhuset — rikstäckande intern grupp.',                          null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('Bjurfors',                             'firma-bjurfors',                   'För dig som jobbar på Bjurfors — rikstäckande intern grupp.',                             null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('SkandiaMäklarna',                      'firma-skandiamaklarna',            'För dig som jobbar på SkandiaMäklarna — rikstäckande intern grupp.',                      null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('Erik Olsson Fastighetsförmedling',     'firma-erik-olsson',                'För dig som jobbar på Erik Olsson — rikstäckande intern grupp.',                          null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('Notar',                                'firma-notar',                      'För dig som jobbar på Notar — rikstäckande intern grupp.',                                null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('Mäklarringen',                         'firma-maklarringen',               'För dig som jobbar på Mäklarringen — rikstäckande intern grupp.',                         null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('ERA Sverige',                          'firma-era-sverige',                'För dig som jobbar på ERA — rikstäckande intern grupp.',                                  null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('Widerlöv & Co',                        'firma-widerlov',                   'För dig som jobbar på Widerlöv & Co — intern grupp.',                                     null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('Södermäklarna',                        'firma-sodermaklarna',              'För dig som jobbar på Södermäklarna — intern grupp.',                                     null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('Våningen & Villan',                    'firma-vaningen-och-villan',        'För dig som jobbar på Våningen & Villan — intern grupp.',                                 null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('Historiska Hem',                       'firma-historiska-hem',             'För dig som jobbar på Historiska Hem — intern grupp.',                                    null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('Alexander White',                      'firma-alexander-white',            'För dig som jobbar på Alexander White — intern grupp.',                                   null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('Karlsson & Uddare',                    'firma-karlsson-uddare',            'För dig som jobbar på Karlsson & Uddare — intern grupp.',                                 null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('Edward & Partners',                    'firma-edward-partners',            'För dig som jobbar på Edward & Partners — intern grupp.',                                 null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('MOHV',                                 'firma-mohv',                       'För dig som jobbar på MOHV — intern grupp.',                                              null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),
    ('Fantastic Frank',                      'firma-fantastic-frank',            'För dig som jobbar på Fantastic Frank — intern grupp.',                                   null, 'Hela Sverige', false, 'approved', admin_id, admin_id, now(), 'firm'),

    -- ── Högskolor med fastighetsmäklarprogram ──────────────────
    ('Mäklarstudenter – Malmö universitet',        'studenter-malmo-universitet', 'För dig som pluggar eller har pluggat fastighetsmäklarprogrammet vid Malmö universitet. Alla årgångar välkomna!',        'Malmö',       'Skåne län',            false, 'approved', admin_id, admin_id, now(), 'school'),
    ('Mäklarstudenter – KTH',                      'studenter-kth',               'För dig som pluggar eller har pluggat fastighetsutveckling/fastighetsförmedling vid KTH. Alla årgångar välkomna!',       'Stockholm',   'Stockholms län',       false, 'approved', admin_id, admin_id, now(), 'school'),
    ('Mäklarstudenter – Högskolan i Gävle',        'studenter-hig',               'För dig som pluggar eller har pluggat fastighetsmäklarprogrammet vid Högskolan i Gävle. Alla årgångar välkomna!',        'Gävle',       'Gävleborgs län',       false, 'approved', admin_id, admin_id, now(), 'school'),
    ('Mäklarstudenter – Högskolan Väst',           'studenter-hogskolan-vast',    'För dig som pluggar eller har pluggat mäklarekonomprogrammet vid Högskolan Väst. Alla årgångar välkomna!',                'Trollhättan', 'Västra Götalands län', false, 'approved', admin_id, admin_id, now(), 'school'),
    ('Mäklarstudenter – Luleå tekniska universitet','studenter-ltu',              'För dig som pluggar eller har pluggat fastighetsmäklarutbildningen vid Luleå tekniska universitet. Alla årgångar välkomna!','Luleå',     'Norrbottens län',      false, 'approved', admin_id, admin_id, now(), 'school'),
    ('Mäklarstudenter – Högskolan i Halmstad',     'studenter-halmstad',          'För dig som pluggar eller har pluggat fastighetsmäklarprogrammet vid Högskolan i Halmstad. Alla årgångar välkomna!',      'Halmstad',    'Hallands län',         false, 'approved', admin_id, admin_id, now(), 'school')
  on conflict (slug) do nothing;
end $$;
