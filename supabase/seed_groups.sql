-- ============================================================
-- MäklarForum: Seed Data — Starter Groups
-- Run AFTER combined_migration.sql
-- Run AFTER creating your admin user
-- ============================================================

-- You need to replace 'YOUR_ADMIN_UUID' below with the actual UUID
-- of your admin user from the profiles table.
-- Find it with: SELECT id FROM profiles WHERE role = 'admin';

-- Uncomment and replace the UUID, then run:

/*
INSERT INTO agent_groups (name, slug, description, municipality, region, status, created_by, approved_by, approved_at, is_private)
VALUES
  ('Stockholm Stad', 'stockholm-stad', 'Mäklare verksamma i Stockholms stad — innerstan och närförorter.', 'Stockholm', 'Stockholm', 'approved', 'YOUR_ADMIN_UUID', 'YOUR_ADMIN_UUID', now(), false),
  ('Göteborg', 'goteborg', 'Mäklare i Göteborgsregionen.', 'Göteborg', 'Västra Götaland', 'approved', 'YOUR_ADMIN_UUID', 'YOUR_ADMIN_UUID', now(), false),
  ('Malmö & Skåne', 'malmo-skane', 'Mäklare i Malmö och övriga Skåne.', 'Malmö', 'Skåne', 'approved', 'YOUR_ADMIN_UUID', 'YOUR_ADMIN_UUID', now(), false),
  ('Uppsala', 'uppsala', 'Mäklare i Uppsala kommun och län.', 'Uppsala', 'Uppsala', 'approved', 'YOUR_ADMIN_UUID', 'YOUR_ADMIN_UUID', now(), false),
  ('Linköping & Norrköping', 'linkoping-norrkoping', 'Mäklare i Östergötlands två största städer.', 'Linköping', 'Östergötland', 'approved', 'YOUR_ADMIN_UUID', 'YOUR_ADMIN_UUID', now(), false),
  ('Västerås & Mälardalen', 'vasteras-malardalen', 'Mäklare i Västerås, Eskilstuna och kringliggande kommuner.', 'Västerås', 'Västmanland', 'approved', 'YOUR_ADMIN_UUID', 'YOUR_ADMIN_UUID', now(), false),
  ('Örebro', 'orebro', 'Mäklare i Örebro kommun.', 'Örebro', 'Örebro', 'approved', 'YOUR_ADMIN_UUID', 'YOUR_ADMIN_UUID', now(), false),
  ('Umeå & Norrland', 'umea-norrland', 'Mäklare i norra Sverige — Umeå, Luleå, Sundsvall m.fl.', 'Umeå', 'Västerbotten', 'approved', 'YOUR_ADMIN_UUID', 'YOUR_ADMIN_UUID', now(), false),
  ('Juridik & Regelverk', 'juridik-regelverk', 'Diskutera juridiska frågor, nya lagar och branschregler.', NULL, NULL, 'approved', 'YOUR_ADMIN_UUID', 'YOUR_ADMIN_UUID', now(), false),
  ('Teknik & Verktyg', 'teknik-verktyg', 'CRM, foto, styling, digitala verktyg och arbetsflöden.', NULL, NULL, 'approved', 'YOUR_ADMIN_UUID', 'YOUR_ADMIN_UUID', now(), false);
*/
