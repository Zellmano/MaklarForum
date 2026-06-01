-- ============================================================
-- MäklarForum — BOOTSTRAP (admin + grupper)
-- Kör EFTER launch_schema.sql.
--
-- FÖRST: skapa din admin-användare i Supabase Dashboard:
--   Authentication → Users → Add user → (din e-post + lösenord,
--   kryssa i "Auto Confirm User"). Valfri domän går bra för admin.
--
-- SEDAN: ändra e-posten på raden nedan till exakt samma adress,
-- och kör hela detta script i SQL Editor.
-- ============================================================

-- 1) Gör din användare till verifierad admin (skapar profilraden om den saknas)
insert into profiles (id, role, full_name, email, verification_status, profile_slug, accepted_terms_at, notification_prefs)
select
  u.id,
  'admin',
  coalesce(u.raw_user_meta_data->>'full_name', 'Administratör'),
  u.email,
  'verified',
  'admin',
  now(),
  jsonb_build_object('email_notifications', true, 'new_question_email', 'immediate', 'new_message_email', 'immediate')
from auth.users u
where u.email = 'ANDRA_MIG@exempel.se'   -- <<<< ÄNDRA TILL DIN ADMIN-E-POST
on conflict (id) do update
  set role = 'admin',
      verification_status = 'verified';

-- 2) Standardgrupp som alla nya mäklare auto-joinar vid godkännande.
--    Privat + is_default = true (ingen manuell ansökan behövs).
insert into agent_groups (name, slug, description, municipality, region, status, is_private, is_default, created_by, approved_by, approved_at)
select
  'Alla mäklare', 'alla-maklare',
  'Gemensam grupp för alla verifierade mäklare på MäklarForum.',
  null, null, 'approved', true, true, p.id, p.id, now()
from profiles p
where p.role = 'admin'
order by p.created_at
limit 1
on conflict (slug) do nothing;

-- 3) Startgrupper som vem som helst kan gå med i direkt (publika).
--    Publika undviker att en gruppägare måste godkänna ansökningar i v1.
insert into agent_groups (name, slug, description, municipality, region, status, is_private, is_default, created_by, approved_by, approved_at)
select g.name, g.slug, g.description, g.municipality, g.region, 'approved', false, false, p.id, p.id, now()
from (select id from profiles where role = 'admin' order by created_at limit 1) p
cross join (values
  ('Stockholm Stad', 'stockholm-stad', 'Mäklare verksamma i Stockholms stad — innerstan och närförorter.', 'Stockholm', 'Stockholm'),
  ('Göteborg', 'goteborg', 'Mäklare i Göteborgsregionen.', 'Göteborg', 'Västra Götaland'),
  ('Malmö & Skåne', 'malmo-skane', 'Mäklare i Malmö och övriga Skåne.', 'Malmö', 'Skåne'),
  ('Uppsala', 'uppsala', 'Mäklare i Uppsala kommun och län.', 'Uppsala', 'Uppsala'),
  ('Linköping & Norrköping', 'linkoping-norrkoping', 'Mäklare i Östergötlands två största städer.', 'Linköping', 'Östergötland'),
  ('Västerås & Mälardalen', 'vasteras-malardalen', 'Mäklare i Västerås, Eskilstuna och kringliggande kommuner.', 'Västerås', 'Västmanland'),
  ('Örebro', 'orebro', 'Mäklare i Örebro kommun.', 'Örebro', 'Örebro'),
  ('Umeå & Norrland', 'umea-norrland', 'Mäklare i norra Sverige — Umeå, Luleå, Sundsvall m.fl.', 'Umeå', 'Västerbotten'),
  ('Juridik & Regelverk', 'juridik-regelverk', 'Diskutera juridiska frågor, nya lagar och branschregler.', null, null),
  ('Teknik & Verktyg', 'teknik-verktyg', 'CRM, foto, styling, digitala verktyg och arbetsflöden.', null, null)
) as g(name, slug, description, municipality, region)
on conflict (slug) do nothing;

-- 4) Snabbkontroll
select 'admins' as what, count(*) from profiles where role = 'admin'
union all
select 'grupper', count(*) from agent_groups
union all
select 'default-grupp', count(*) from agent_groups where is_default;
