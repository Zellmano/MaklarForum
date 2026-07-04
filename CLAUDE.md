# MäklarForum — Master Specification

## V1: B2B-community för svenska fastighetsmäklare

**Version:** 1.0
**Datum:** 2026-04-24
**Status:** Beta-readiness

---

## 1. VISION & KÄRNVÄRDE

MäklarForum är ett **slutet community för verifierade fastighetsmäklare i Sverige**. En plattform där mäklare kan diskutera, dela erfarenheter, rösta om frågor och bygga nätverk i geografiskt avgränsade grupper.

**Kärnlöfte:** En professionell, modererad mötesplats där mäklare kan ställa frågor till varandra, hitta lokala kollegor och utbyta kunskap — utan brus från konsumenter.

**Tre principer:**

1. **Endast verifierade mäklare:** Företagsmail krävs vid registrering. Admin godkänner manuellt innan profilen aktiveras.
2. **Geografiskt relevant:** Grupper är knutna till kommun/region. Mäklare hittar kollegor i sitt område.
3. **Modererat:** Admin-team kan suspendera profiler, moderera inlägg och hantera rapporter.

---

## 2. MÅLGRUPP

**Primärt:** Aktiva fastighetsmäklare i Sverige (registrerade hos FMI eller liknande). Cirka 7 000 personer.

**Sekundärt:** Mäklarassistenter, mäklarkontorsadmin (via inbjudan i framtida version).

**Inte målgrupp:** Konsumenter (köpare/säljare). Plattformen är inte publik — innehåll ligger bakom inloggning.

---

## 3. V1 SCOPE

### 3.1 Inkluderat i V1

**A) Auth & Verifiering**
- Registrering: fullt namn, företagsmail, lösenord, mäklarfirma, stad
- Företagsmail krävs (gmail/hotmail/outlook etc. blockeras)
- Profilen sätts till `verification_status: 'pending'` tills admin godkänner
- E-postverifiering via Supabase
- Ingen BankID eller FMI-nummer-koll i V1 (manuell admin-verifiering räcker)

**B) Mäklargrupper (huvudfeature)**
- Geografiskt knutna grupper (kommun/region)
- **Privata by default:** Nya grupper skapas privata; gå med via join-request som owner godkänner
- **Offentliga grupper:** Stöds av datamodellen (`is_private = false`) men används inte i V1-default
- Alla mäklare kan föreslå nya grupper (admin godkänner)
- En mäklare kan vara med i flera grupper
- Default-grupp som nya mäklare auto-joinar vid onboarding
- Inom grupp: diskussioner, röstning, polls, kommentarer
- Invite-system: spårade unika länkar, max 3 invites/dag

**C) Diskussioner & Frågor**
- Mäklare ställer frågor till andra mäklare
- Frågor är taggade med kategori (juridik, budgivning, teknik, allmänt etc.)
- Kan vara öppna (alla mäklare) eller bundna till specifik grupp
- Svar med up/down-röstning av andra mäklare
- Kommentarer på svar

**D) Mäklarprofiler (internt)**
- Profilsida med namn, firma, stad, bio, avatar-upload
- Lista på senaste svar och diskussioner
- Friends/connections mellan mäklare
- Avatar-bubblor visas konsekvent i alla vyer
- Bara synlig för inloggade mäklare (B2B-community, inte publik SEO)

**E) Direktmeddelanden**
- Mäklare kan skicka DM till varandra
- Inkorg, lästa/olästa, konversationsvy

**F) Onboarding**
- Efter registrering: välj 1-3 grupper baserat på din kommun/region
- Beskrivning av community-regler

**G) Admin**
- Godkänna/avslå nya mäklarregistreringar
- Godkänna/avslå nya gruppförslag
- Moderering: rapporterade inlägg, blockerade termer
- Översikt: antal mäklare, aktiva grupper, väntande verifieringar

**H) Statiska sidor**
- Användarvillkor
- Integritetspolicy
- Ansvarsfriskrivning
- Prissida (markerad som "Gratis under beta")

### 3.2 EJ i V1 (sparas till senare)

- BankID-inloggning
- Stripe-betalning (beta är gratis)
- Annonser/leads till mäklare
- Publika mäklarprofiler för SEO
- Köpare/säljare som användare
- Konsumentguider eller ordlista
- Forum-publikt innehåll
- Notifikationer via mail/SMS
- Mobilapp (responsiv webb räcker)

---

## 4. TECH STACK

```
Frontend: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4
Backend:  Supabase (PostgreSQL + Auth + RLS + Storage)
Hosting:  Vercel (EU-region) + Supabase (EU-region)
Auth:     Supabase Auth (email/password)
```

Inga externa AI-tjänster, e-postintegrationer eller betalningsflöden i V1.

---

## 5. DATAMODELL

Implementerade tabeller (se `supabase/migrations/`):

| Tabell | Syfte |
|---|---|
| `profiles` | Mäklarprofiler kopplade till `auth.users` |
| `agent_areas` | Mäklarens bevakade kommuner/regioner |
| `agent_groups` | Mäklargrupper med geo-knytning, privata by default (`is_private` flag) |
| `agent_group_members` | Medlemskap (owner/member) |
| `group_join_requests` | Köpan för privata grupper |
| `questions` | Diskussioner/frågor (mäklare-till-mäklare) |
| `answers` | Svar på frågor |
| `answer_comments` | Kommentarer på svar |
| `answer_votes` | Upp/ned-röster på svar |
| `agent_tips` | Tips från mäklare till mäklare |
| `agent_tip_votes` | Röster på tips |
| `messages` | Direktmeddelanden |
| `question_watchers` | Bevakade diskussioner |
| `forum_posts` | Internt forum (juridik, teknik, rekrytering) |
| `moderation_queue` | Modererings-kö |
| `reported_content` | Rapporterat innehåll |
| `lead_dispatch_logs` | Loggar (för framtida lead-dispatch) |
| `billing_events` | Stripe-events (framtida) |

Alla tabeller har RLS aktiverat. Multi-tenant isoleras genom user-ID baserade policies.

---

## 6. STRUKTUR

```
src/app/
├── (public)
│   ├── page.tsx              # Landing (CTA: registrera/logga in)
│   ├── login/page.tsx        # En enda inloggning för mäklare
│   ├── register/page.tsx     # En enda registrering
│   ├── villkor/page.tsx
│   ├── integritet/page.tsx
│   ├── disclaimer/page.tsx
│   └── priser/page.tsx       # Markerad "Gratis under beta"
├── onboarding/page.tsx       # Välj grupper efter registrering
├── dashboard/                # All app-funktionalitet bakom auth
│   ├── page.tsx              # Mäklarens hemvy
│   ├── profil/page.tsx
│   ├── grupper/
│   │   ├── page.tsx          # Lista alla
│   │   ├── ny/page.tsx       # Skapa ny
│   │   └── [slug]/page.tsx   # Gruppdetalj + diskussioner
│   ├── fragor/
│   │   ├── page.tsx          # Alla frågor (geo-filtrerade)
│   │   ├── ny/page.tsx
│   │   └── [slug]/page.tsx
│   ├── medlemmar/            # Intern mäklarkatalog
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── messages/
│   │   ├── page.tsx
│   │   └── [userId]/page.tsx
│   └── forum/page.tsx        # Internt forum (juridik, teknik, rekrytering)
└── admin/
    └── page.tsx              # Verifiering, moderering, översikt
```

---

## 7. SVERIGE-SPECIFIKT

- **Språk:** Allt UI och allt innehåll på svenska
- **EU-hosting:** Vercel `arn1` (Stockholm) + Supabase EU-region
- **Företagsmail:** Blockerar gmail.com, hotmail.com, outlook.com, icloud.com, yahoo.com, live.com
- **Manuell verifiering:** Admin godkänner varje ny mäklare innan profilen aktiveras
- **GDPR:** Hard-delete via Art. 17-flöde (profil → auth-cascade), self-service export (Art. 15), datalagring i EU

---

## 8. DEFINITION OF DONE (per feature)

- [ ] TypeScript utan `any`
- [ ] Responsiv (mobil + tablet + desktop)
- [ ] RLS-policies enforcar korrekt isolation
- [ ] Laddningstillstånd och felhantering
- [ ] Alla texter på svenska
- [ ] Hard-delete vid GDPR-radering (cascade), state-flagga vid suspendering
- [ ] Formulärvalidering (klient + server)
- [ ] Konventionellt commit-meddelande

---

## 9. ROADMAP EFTER V1

**V2 (1-3 månader efter beta):**
- BankID-inloggning
- Stripe-betalning (Pro/Team-planer)
- E-postnotifikationer (nya svar, nya inlägg i grupper)
- WYSIWYG-editor för diskussioner
- Bilagor i inlägg (bilder, PDF)
- Sökfunktion
- **Objektsamarbete:** två mäklare på olika firmor som delar samma kund/objekt
  kan starta ett "samarbete" — en delad yta kopplad till båda profilerna med
  egen konversation (bygger på DM-systemet), gemensamma anteckningar om
  objektet och tydlig status (pågående/avslutat). Startas från motpartens
  profilsida; kräver att båda accepterar (samma mönster som
  `agent_connections`-förfrågningar).

**V3 (3-6 månader):**
- Mobilapp (PWA eller React Native)
- Lead-dispatch (kvalificerade leads till premium-mäklare)
- Branschnyheter-feed
- Eventkalender (mäklarutbildningar, mässor)
- Mentorprogram (senior ↔ junior mäklare)

**V4+:**
- Nordisk expansion (Norge, Finland, Danmark)
- API för tredjepartsintegrationer
- White-label för stora mäklarkedjor

---

*Senast uppdaterad: 2026-05-24*
*Status: V1 redo för beta-test*
