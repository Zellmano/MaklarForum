export default function PrivacyPage() {
  return (
    <article className="card max-w-4xl">
      <h1 className="text-4xl">Integritetspolicy</h1>
      <p className="mt-4 text-sm text-[var(--muted)]">Senast uppdaterad: 24 april 2026</p>
      <div className="mt-6 space-y-4 text-sm leading-6">
        <p>
          MäklarForum är personuppgiftsansvarig för de uppgifter du lämnar när du registrerar dig och använder plattformen. Vi följer GDPR.
        </p>
        <p>
          <strong>Vad vi samlar in:</strong> namn, företagsmail, mäklarfirma, stad, profilbild (valfri), bio (valfri), och din aktivitet på plattformen (inlägg, svar, röster, gruppmedlemskap).
        </p>
        <p>
          <strong>Varför:</strong> för att kunna verifiera att du är mäklare, hålla communityt säkert, leverera tjänsten och kontakta dig om viktiga uppdateringar.
        </p>
        <p>
          <strong>Var vi lagrar data:</strong> all data lagras inom EU (Supabase EU-region, Vercel EU-region). Vi exporterar inte data utanför EU.
        </p>
        <p>
          <strong>Underbiträden:</strong> Supabase (databas + auth), Vercel (hosting). Inga andra tredjeparter har tillgång till dina personuppgifter under beta.
        </p>
        <p>
          <strong>Dina rättigheter:</strong> du kan när som helst exportera all din data eller radera ditt konto direkt under <em>Min profil → Mina data &amp; integritet</em>. För rättelse av enskilda uppgifter, kontakta support@maklarforum.se.
        </p>
        <p>
          <strong>Cookies:</strong> vi använder endast nödvändiga cookies för inloggning och session.
        </p>
      </div>
    </article>
  );
}
